const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise'); // MySQL 모듈 추가
const app = express();
const path = require('path');
const sdk = require('./sdk');
const crypto = require('crypto');

const PORT = 8001;
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 간단한 관리자 인증 (실제 환경에서는 더 강력한 인증 시스템 필요)
const ADMIN_PASSWORD = 'admin123'; // 실제 환경에서는 더 보안적으로 강화된 방법사용

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

// ============ 관리자 전용 API ============

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

// ============ MySQL 데이터 확인용 API (관리자 전용) ============

// MySQL에 저장된 유권자 해시 목록 조회 (Admin only)
app.get('/admin/getMySQLVoters', authenticateAdmin, async function(req, res) {
    try {
        const connection = await mysql.createConnection(voting_app);
        
        const [rows] = await connection.execute(`
            SELECT 
                id,
                name_hash,
                ssn_hash,
                address_hash,
                created_at
            FROM voters 
            ORDER BY created_at DESC
        `);
        
        await connection.end();
        
        res.json({
            success: true,
            count: rows.length,
            data: rows,
            message: `MySQL에 저장된 유권자 ${rows.length}명의 해시 데이터입니다.`
        });
        
    } catch (err) {
        console.error('MySQL 조회 에러:', err);
        res.status(500).json({
            error: 'MySQL 데이터 조회 중 오류가 발생했습니다.',
            detail: err.message
        });
    }
});

// MySQL 연결 상태 확인 (Admin only)
app.get('/admin/checkMySQLConnection', authenticateAdmin, async function(req, res) {
    try {
        const connection = await mysql.createConnection(voting_app);
        
        // 연결 테스트 쿼리
        const [rows] = await connection.execute('SELECT 1 as test');
        
        // 테이블 존재 확인
        const [tables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = 'voting_app' AND TABLE_NAME = 'voters'
        `);
        
        // 총 레코드 수 확인
        const [count] = await connection.execute('SELECT COUNT(*) as total FROM voters');
        
        await connection.end();
        
        res.json({
            success: true,
            connection: 'OK',
            database: 'voting_app',
            table_exists: tables.length > 0,
            total_records: count[0].total,
            message: 'MySQL 연결 및 테이블 상태가 정상입니다.'
        });
        
    } catch (err) {
        console.error('MySQL 연결 확인 에러:', err);
        res.status(500).json({
            error: 'MySQL 연결 확인 중 오류가 발생했습니다.',
            detail: err.message,
            tip: '1. MySQL 서버가 실행 중인지 확인하세요. 2. 데이터베이스와 테이블이 생성되어 있는지 확인하세요.'
        });
    }
});

// MySQL 테이블 초기화 (Admin only) - 주의: 모든 데이터 삭제
app.post('/admin/clearMySQLVoters', authenticateAdmin, async function(req, res) {
    try {
        const { confirm } = req.body;
        
        if (confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({
                error: '데이터 삭제 확인이 필요합니다.',
                message: 'POST 요청의 body에 {"confirm": "DELETE_ALL_DATA"}를 포함해주세요.'
            });
        }
        
        const connection = await mysql.createConnection(voting_app);
        
        // 삭제 전 레코드 수 확인
        const [beforeCount] = await connection.execute('SELECT COUNT(*) as total FROM voters');
        
        // 모든 데이터 삭제
        await connection.execute('DELETE FROM voters');
        
        // AUTO_INCREMENT 리셋
        await connection.execute('ALTER TABLE voters AUTO_INCREMENT = 1');
        
        await connection.end();
        
        res.json({
            success: true,
            deleted_records: beforeCount[0].total,
            message: `MySQL에서 ${beforeCount[0].total}개의 유권자 데이터가 삭제되었습니다.`
        });
        
    } catch (err) {
        console.error('MySQL 데이터 삭제 에러:', err);
        res.status(500).json({
            error: 'MySQL 데이터 삭제 중 오류가 발생했습니다.',
            detail: err.message
        });
    }
});
// 관리자 비밀번호 검증용 API
app.post('/admin/admin-login', function (req, res) {
    const adminKey = req.headers['admin-key'];

    if (adminKey === ADMIN_PASSWORD) {
        return res.status(200).json({ message: '관리자 인증 성공' });
    } else {
        return res.status(401).json({ message: '비밀번호가 올바르지 않습니다.' });
    }
});

// Initialize the voting system with mandatory time setting (Admin only)
app.post('/admin/init', authenticateAdmin, function (req, res) {
    const { durationMinutes } = req.body;

    // 투표 시간 필수 입력 체크
    if (!durationMinutes) {
        return res.status(400).json({ 
            error: '투표 시간(분)은 필수입니다.',
            message: 'JSON body에 durationMinutes를 포함해주세요. 예: { "durationMinutes": 30 }'
        });
    }

    // 숫자 형식 체크
    const duration = parseInt(durationMinutes);
    if (isNaN(duration)) {
        return res.status(400).json({ 
            error: '투표 시간은 숫자로 입력해야 합니다.',
            example: '예: { "durationMinutes": 30 }'
        });
    }

    // 범위 체크
    if (duration < 1) {
        return res.status(400).json({ 
            error: '투표 시간은 최소 1분 이상이어야 합니다.'
        });
    }

    if (duration > 1440) {
        return res.status(400).json({ 
            error: '투표 시간은 최대 1440분(24시간)을 초과할 수 없습니다.'
        });
    }

    const args = [duration.toString()];
    sdk.send(false, 'initializeVotingSystem', args, res);
});


// Extend voting time (Admin only)
app.get('/admin/extendVotingTime', authenticateAdmin, function (req, res) {
    let additionalMinutes = req.query.additionalMinutes;
    if (!additionalMinutes || isNaN(parseInt(additionalMinutes))) {
        return res.status(400).json({ error: '연장할 시간(분)을 숫자로 입력해주세요.' });
    }
    let args = [additionalMinutes];
    sdk.send(false, 'extendVotingTime', args, res);
});

// Register a product (Admin only)
app.get('/admin/registerProduct', authenticateAdmin, function (req, res) {
    let productId = req.query.productId;
    let productName = req.query.productName;

    if( !productId || !productName) {
        return res.status(400).json({ error: 'productId와 productName은 필수입니다.' });
    }
    let args = [productId, productName];
    sdk.send(false, 'registerProduct', args, res);
});

// Register a candidate (Admin only)
app.post('/admin/registerCandidate', authenticateAdmin, function (req, res) {
    const { candidateId, name, partyName } = req.body
    
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
app.get('/admin/getCandidateInfo', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    if (!candidateId) {
        return res.status(400).json({ error: 'candidateId는 필수입니다.' });
    }
    let args = [candidateId];
    sdk.send(true, 'getCandidateInfo', args, res);
});

// delete a candidate (Admin only)
app.get('/admin/deleteCandidate', authenticateAdmin, function (req, res) {
    let candidateId = req.query.candidateId;
    if (!candidateId) {
        return res.status(400).json({ error: 'candidateId는 필수입니다.' });
    }
    let args = [candidateId];
    sdk.send(false, 'deleteCandidate', args, res);
});

// get all products (관리자가 볼 수 있는 상품 목록)
app.get('/admin/getAllProducts', authenticateAdmin, function (req, res) {
    let args = [];
    sdk.send(true, 'getAllProducts', args, res);
});

//상품 등록 API
app.post('/admin/registerProduct', authenticateAdmin, function (req, res) {
    const { productId, productName } = req.body;

    if (!productId || !productName) {
        return res.status(400).json({ error: 'productId와 productName은 필수입니다.' });
    }

    const args = [productId, productName];
    sdk.send(false, 'registerProduct', args, res);
});

// 상품 삭제 API
app.get('/admin/deleteProduct', authenticateAdmin, function (req, res) {
    const productId = req.query.productId;
    if (!productId) {
        return res.status(400).json({ error: 'productId는 필수입니다.' });
    }
    const args = [productId];
    sdk.send(false, 'deleteProduct', args, res);
});


// ============ 투표자 전용 API ============

// Register a voter - GET과 POST 모두 지원
app.get('/voter/registerVoter', async function(req, res) {
    try {
        // 쿼리 파라미터에서 값 받기
        const { name, rrnSuffix, addr } = req.query;

        // 입력 검증
        if (!name || !rrnSuffix || !addr) {
            return res.status(400).json({ error: 'name, rrnSuffix, addr는 필수입니다.' });
        }

        if (rrnSuffix.length !== 7) {
            return res.status(400).json({ error: '주민등록번호 뒷자리는 7자리여야 합니다.' });
        }

        // 체인코드 호출
        const args = [name, rrnSuffix, addr];
        sdk.send(false, 'registerVoter', args, res);

    } catch (err) {
        console.error('유권자 등록 중 에러:', err);
        return res.status(500).json({
            error: '유권자 등록 중 서버 오류가 발생했습니다.',
            detail: err.message,
        });
    }
});

// Register a voter with MySQL - POST 방식 (추가 기능)
app.post('/voter/registerVoterWithMySQL', async function(req, res) {
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
        try {
                        const [existingByNameAndSSN] = await connection.execute(`
                SELECT id, created_at 
                FROM voters 
                WHERE name_hash = ? AND ssn_hash = ?
            `, [nameHash, ssnHash]);
            
            if (existingByNameAndSSN.length > 0) {
                await connection.end();
                console.log(`❌ 중복 발견: ${name} (이름+주민번호 조합)`);
                return res.status(400).json({ 
                    error: '이미 등록된 유권자입니다.',
                    detail: '동일한 이름과 주민등록번호로 등록된 유권자가 존재합니다.',
                    existing_id: existingByNameAndSSN[0].id,
                    registered_at: existingByNameAndSSN[0].created_at
                });
            }
            const insertQuery = `
                INSERT INTO voters (name_hash, ssn_hash, address_hash)
                VALUES (?, ?, ?)
            `;
            await connection.execute(insertQuery, [nameHash, ssnHash, addressHash]);
            
            // Fabric 체인코드 호출 (뒷 7자리만 사용)
            const rrnSuffix = rrnFull.slice(-7);
            const hashedName = sha256(name);
            const hashedRrnSuffix = sha256(rrnSuffix);
            const args = [hashedName, hashedRrnSuffix, address];

            // 커스텀 응답 처리
            const originalRes = res;
            const customRes = {
                json: function(data) {
                    originalRes.json({
                        ...data,
                        mysqlSaved: true,
                        message: data.message ? data.message + ' (MySQL에도 저장됨)' : '등록 완료 (MySQL에도 저장됨)'
                    });
                },
                status: function(code) {
                    return originalRes.status(code);
                }
            };

            sdk.send(false, 'registerVoter', args, customRes);
            
        } catch (mysqlError) {
            await connection.end();
            
            // MySQL 고유 제약 조건 위반 에러 처리
            if (mysqlError.code === 'ER_DUP_ENTRY') {
                console.log(`❌ MySQL 중복 키 에러: ${name}`);
                return res.status(400).json({
                    error: '중복된 데이터입니다.',
                    detail: 'MySQL 데이터베이스에서 중복 키 제약 조건에 위배됩니다.',
                    mysql_error: mysqlError.sqlMessage
                });
            }
            
            throw mysqlError; // 다른 에러는 외부 catch로 전달
        }
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
    const { voterName, rrnSuffix, candidateName } = req.body;

    if (!voterName || !rrnSuffix || !candidateName) {
        return res.status(400).json({ error: 'voterName, rrnSuffix, candidateName는 필수입니다.' });
    }

    const hashrnn = sha256(rrnSuffix);
    const args = [voterName, hashrnn, candidateName];

    sdk.send(false, 'vote', args, res);
});

// Get voter information
app.get('/voter/getVoterInfo', function (req, res) {
    const voterName = req.query.voterName;
    const rrnSuffix = req.query.rrnSuffix;
    
    if (!voterName || !rrnSuffix) {
        return res.status(400).json({ error: 'voterName과 rrnSuffix는 필수입니다.' });
    }
    
    const hashrnn = sha256(rrnSuffix);

    const args = [voterName, hashrnn];
    sdk.send(true, 'getVoterInfo', args, res);
});

// Get available candidates for voting (투표자가 볼 수 있는 후보자 목록)
app.get('/voter/getCandidates', function (req, res) {
    let args = [];
    sdk.send(true, 'getAllCandidates', args, res);
});

// Purchase a product (투표자가 상품을 구매)
app.get('/voter/purchaseProduct', function (req, res) {
    const productName = req.query.productName;
    const voterName = req.query.voterName;
    const rrnSuffix = req.query.rrnSuffix;

    if (!productName || !voterName || !rrnSuffix) {
        return res.status(400).json({ error: '상품명, 투표자이름, 주민번호 뒷자리는 모두 필수입니다.' });
    }

    const hashrnn = sha256(rrnSuffix);
    const args = [productName, voterName, hashrnn];
    sdk.send(false, 'purchaseProduct', args, res);
});

// get all products (투표자가 볼 수 있는 상품 목록)
app.get('/voter/getProducts', function (req, res) {
    let args = [];
    sdk.send(true, 'getAllProducts', args, res);
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

// API 엔드포인트 목록 출력
console.log('\n=== API 엔드포인트 목록 ===');
console.log('투표자 API:');
console.log('  GET  /voter/registerVoter?name=&rrnSuffix=&addr= - 유권자 등록 (기존)');
console.log('  POST /voter/registerVoterWithMySQL - 유권자 등록 (MySQL 연동)');
console.log('  GET  /voter/vote?voterName=&rrnSuffix=&candidateName= - 투표하기');
console.log('  GET  /voter/getVoterInfo?voterName=&rrnSuffix= - 유권자 정보 조회');
console.log('  GET  /voter/getCandidates - 후보자 목록 조회');
console.log('  GET  /voter/getProducts - 상품 목록 조회');
console.log('========================\n');