const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const sdk = require('./sdk');
const mysql = require('mysql2');
const crypto = require('crypto');
app.use(express.json()); // application/json 타입 요청 파싱
app.use(express.urlencoded({ extended: true })); // application/x-www-form-urlencoded 타입 요청 파싱


const PORT = 8001;
const HOST = '0.0.0.0';

app.use(cors());


const ADMIN_PASSWORD = 'admin123';

// -------------------- MySQL 설정 --------------------

const voting_app = {
  host: 'localhost',
  user: 'root',
  password: '1111',
  database: 'voting_app',
  charset: 'utf8mb4'
};

// SHA-256 해시 함수 (입력 문자열 → 16진수 해시)
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}


// 간단한 관리자 인증 (실제 환경에서는 더 강력한 인증 시스템 필요)

// 관리자 인증 미들웨어
function authenticateAdmin(req, res, next) {
    const adminKey = req.headers['admin-key'] || req.query.adminKey;
    if (adminKey !== ADMIN_PASSWORD) {
        return res.status(401).json({ 
            error: '관리자 권한이 필요합니다.',
            message: 'Admin authentication required' 
        });
    }
    next();
}
4
// ============ 관리자 전용 API ============

// Initialize the voting system (Admin only)
app.get('/admin/init', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(false, 'initializeVotingSystem', args, res);
});

// Register a candidate (Admin only)
app.get('/admin/registerCandidate', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    let name = req.query.name;
    let partyName = req.query.partyName;
    
    if (!candidateId || !name || !partyName) {
        return res.status(400).json({ error: 'candidateId, name, partyName는 필수입니다.' });
    }
    
    let args = [candidateId, partyName, name];
    sdk.send(false, 'registerCandidate', args, res);
});

// End the voting process (Admin only)
app.get('/admin/endVoting', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(false, 'endVoting', args, res);
});

// Get voting results (Admin only)
app.get('/admin/getVotingResults', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(true, 'getVotingResults', args, res);
});

// Get all candidates (Admin only)
app.get('/admin/getAllCandidates', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(true, 'getAllCandidates', args, res);
});

// Get candidate information (Admin only)
// JSON 바디 파싱 미들웨어는 서버 초기 설정에 반드시 포함되어 있어야 합니다:

app.post('/voter/registerVoter', async function(req, res, next) {
  try {
    // JSON 바디에서 값 받기
    const { name, rrnFull, address } = req.body;

    // 입력 검증
    if (!name || !rrnFull || !address) {
      return res.status(400).json({ error: 'name, rrnFull, address는 필수입니다.' });
    }
    if (rrnFull.length !== 13) {
      return res.status(400).json({ error: '주민등록번호는 13자리여야 합니다.' });
    }

    // SHA-256 해시 생성
    const nameHash = sha256(name);
    const ssnHash = sha256(rrnFull);
    const addressHash = sha256(address);

    // MySQL 연결 및 저장
    const connection = await mysql.createConnection(voting_app);
    const insertQuery = `
      INSERT INTO voters (name_hash, ssn_hash, address_hash)
      VALUES (?, ?, ?)
    `;
    await connection.execute(insertQuery, [nameHash, ssnHash, addressHash]);
    await connection.end();

    // Fabric 체인코드 호출
    const args = [name, rrnFull];
    await sdk.send(false, 'registerVoter', args, res);

  } catch (err) {
    console.error('유권자 등록 중 에러:', err);
    return res.status(500).json({
      error: '유권자 등록 중 서버 오류가 발생했습니다.',
      detail: err.message,
    });
  }
});

// Cast a vote
app.post('/voter/vote', function (req, res) {
  const voterName = req.query.voterName;
  const rrnFull = req.query.rrnFull;
  const candidateName = req.query.candidateName;
  
  if (!voterName || !rrnFull || !candidateName) {
    return res.status(400).json({ error: 'voterName, rrnFull, candidateName는 필수입니다.' });
  }
  
  const args = [voterName, rrnFull, candidateName];
  sdk.send(false, 'vote', args, res);
});

// Get voter information
app.get('/voter/getVoterInfo', function (req, res) {
  const voterName = req.query.voterName;
  const rrnFull = req.query.rrnFull;
  
  if (!voterName || !rrnFull) {
    return res.status(400).json({ error: 'voterName과 rrnFull는 필수입니다.' });
  }
  
  const args = [voterName, rrnFull];
  sdk.send(true, 'getVoterInfo', args, res);
});

// Get available candidates for voting (투표자가 볼 수 있는 후보자 목록)
app.get('/voter/getCandidates', function (req, res) {
  let args = [];
  sdk.send(true, 'getAllCandidates', args, res);
});

// ============ 공통 API ============

// Check voting status (공개 정보)
app.get('/public/votingStatus', function (req, res) {
    let args = [];
    // 전체 투표 결과를 가져와서 클라이언트에서 필요한 정보만 사용하도록 함
    sdk.send(true, 'getVotingResults', args, res);
});

// ============ 정적 파일 서빙 ============

// 관리자 페이지
app.get('/admin', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/admin.html'));
});

// 투표자 페이지
app.get('/voter', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/voter.html'));
});

// 기본 페이지 (선택 화면)
app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

// 정적 파일들
app.use(express.static(path.join(__dirname, '../client')));

// ============ 에러 핸들링 ============

// 404 에러 처리
app.use(function(req, res, next) {
    res.status(404).json({ error: 'API 엔드포인트를 찾을 수 없습니다.' });
});

// 일반 에러 처리
app.use(function(err, req, res, next) {
    console.error(err.stack);
    res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
console.log(`관리자 페이지: http://${HOST}:${PORT}/admin`);
console.log(`투표자 페이지: http://${HOST}:${PORT}/voter`);
console.log(`관리자 비밀번호: ${ADMIN_PASSWORD}`);