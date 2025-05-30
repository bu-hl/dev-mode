const express = require('express');
const app = express();
const path = require('path');
const mysql = require('mysql2');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const sdk = require('./sdk');

const PORT = 8001;
const HOST = '0.0.0.0';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// MySQL 연결 설정
const db = mysql.createConnection({
    host: 'localhost',
    user: 'webuser',
    password: 'yourpassword',
    database: 'walletdb'
});

// 테이블 초기화
const userTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(100) NOT NULL UNIQUE,
    tickets INT DEFAULT 0,
    prop VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

const drawTableQuery = `
  CREATE TABLE IF NOT EXISTS draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    wallet_address VARCHAR(100) NOT NULL,
    random VARCHAR(20) NOT NULL,
    prop TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

db.connect(err => {
    if (err) {
        console.error('❌ DB 연결 오류:', err);
        process.exit(1);
    }
    console.log('✅ MySQL 연결 성공');
    db.query(userTableQuery);
    db.query(drawTableQuery);
});

// 🔐 개인키 및 공개키 로드
const privateKey = fs.readFileSync('../../private.pem', 'utf8');
// 난수 + 서명 생성
function generateRandomAndSignature(userID) {
    const random = Math.floor(Math.random() * 1_000_000).toString();
    const message = `${random}|${userID}`;
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');
    console.log("▶ 생성된 message:", message);
    console.log("▶ 서명:", signature);

    return { random, signature };
}

// 사용자 등록
app.post('/addUser', async (req, res) => {
    const { userID } = req.body;
    try {
        const [rows] = await db.promise().query(
            'SELECT tickets FROM users WHERE wallet_address = ?',
            [userID]
        );

        if (rows.length === 0) {
            await db.promise().query(
                'INSERT INTO users (wallet_address, tickets) VALUES (?, ?)',
                [userID, 1]
            );
            await sdk.send(false, 'RegisterUser', [userID]);
            return res.json({
                success: true,
                already: false,
                tickets: 1,
                message: '신규 사용자 등록 및 체인코드 초기화 완료'
            });
        }

        return res.json({
            success: true,
            already: true,
            tickets: rows[0].tickets,
            message: '이미 등록된 사용자입니다.'
        });
    } catch (err) {
        console.error('addUser 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// 뽑기권 증가
app.post('/plusTicket', async (req, res) => {
    const { userID } = req.body;
    try {
        const [rows] = await db.promise().query(
            'SELECT tickets FROM users WHERE wallet_address = ?',
            [userID]
        );
        let newTickets;

        if (rows.length === 0) {
            newTickets = 1;
            await db.promise().query(
                'INSERT INTO users (wallet_address, tickets) VALUES (?, ?)',
                [userID, newTickets]
            );
        } else {
            newTickets = rows[0].tickets + 1;
            await db.promise().query(
                'UPDATE users SET tickets = ? WHERE wallet_address = ?',
                [newTickets, userID]
            );
        }

        const exists = await sdk.send(true, 'UserExists', [userID]);
        if (!exists || exists === 'false') {
            await sdk.send(false, 'RegisterUser', [userID]);
        }

        await sdk.send(false, 'PlusTicket', [userID]);

        return res.json({ success: true, tickets: newTickets });
    } catch (err) {
        console.error('plusTicket 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// 티켓 수 조회
app.get('/showticket/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        const [rows] = await db.promise().query(
            'SELECT tickets FROM users WHERE wallet_address = ?',
            [userID]
        );
        const tickets = rows.length === 0 ? 0 : rows[0].tickets;
        return res.json({ success: true, tickets });
    } catch (err) {
        console.error('showticket 오류:', err);
        return res.status(500).json({ success: false, tickets: 0 });
    }
});

// 뽑기 및 서명
app.post('/useTicket', async (req, res) => {
    const { userID } = req.body;
    try {
        const [rows] = await db.promise().query(
            'SELECT tickets FROM users WHERE wallet_address = ?',
            [userID]
        );


        if (rows.length === 0 || rows[0].tickets < 1) {
            return res.status(400).json({ success: false, message: '티켓 부족' });
        }

        const newCount = rows[0].tickets - 1;
        await db.promise().query(
            'UPDATE users SET tickets = ? WHERE wallet_address = ?',
            [newCount, userID]
        );

        const { random, signature } = generateRandomAndSignature(userID);

        const exists = await sdk.send(true, 'UserExists', [userID]);
        if (!exists) {
            await sdk.send(false, 'RegisterUser', [userID]);
        }

        await sdk.send(false, 'SubmitDraw', [userID, random, signature]);

        // 🎯 draws 테이블에 저장
        await db.promise().query(
            'INSERT INTO draws (wallet_address, random, prop) VALUES (?, ?, ?)',
            [userID, random, signature]
        );

        return res.json({
            success: true,
            tickets: newCount,
            random,
            proof: signature,
            message: '뽑기 완료 및 서명 기록'
        });
    } catch (err) {
        console.error('useTicket 오류:', err);
        return res.status(500).json({ success: false, message: err.message });
    }
});

// 서명 검증
// 공개키 로드
const publicKey = fs.readFileSync('../../public.pem', 'utf8');

app.post('/verifyDraw', (req, res) => {
    const { userID, random, proof } = req.body;

    if (!userID || !random || !proof) {
        return res.status(400).json({ success: false, message: '필수 값 누락' });
    }

    const message = `${random}|${userID}`;
    console.log("🔍 검증 대상 메시지:", message);
    console.log("🔐 전달된 서명:", proof);

    try {
        const verify = crypto.createVerify('SHA256');
        verify.update(message);
        verify.end();
        const isValid = verify.verify(publicKey, proof, 'hex');

        return res.json({ success: true, isValid });
    } catch (err) {
        console.error('verifyDraw 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// ✅ 뽑기 이력 조회 API
app.get('/drawHistory/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        const [rows] = await db.promise().query(
            'SELECT random, prop FROM draws WHERE wallet_address = ? ORDER BY created_at DESC',
            [userID]
        );
        return res.json({
            success: true,
            draws: rows.map(row => ({
                random: row.random,
                proof: row.prop
            }))
        });
    } catch (err) {
        console.error('drawHistory 오류:', err);
        return res.status(500).json({
            success: false,
            message: '서버 내부 오류'
        });
    }
});
const commits = new Map();  // 인메모리 저장. Redis 등 영속 저장도 가능

app.post('/commit', (req, res) => {
    const { userID, userCommit } = req.body;

    if (!userID || !userCommit) {
        return res.status(400).json({ success: false, message: '필수 값 누락' });
    }

    // 서버 시드 생성
    const serverSeed = crypto.randomBytes(32).toString('hex');

    // 저장
    commits.set(userID, { userCommit, serverSeed });

    console.log(`📥 Commit 저장됨 for ${userID}`);
    return res.json({ success: true, serverSeed });
});
app.post('/reveal', async (req, res) => {
    const { userID, userSeed } = req.body;

    if (!userID || !userSeed) {
        return res.status(400).json({ success: false, message: '필수 값 누락' });
    }

    const entry = commits.get(userID);
    if (!entry) {
        return res.status(400).json({ success: false, message: '해당 커밋 없음' });
    }

    const { userCommit, serverSeed } = entry;

    // 커밋 검증
    const actualHash = crypto.createHash('sha256').update(userSeed).digest('hex');
    if (actualHash !== userCommit) {
        return res.status(400).json({ success: false, message: '커밋 검증 실패' });
    }

    // 랜덤값 생성
    const random = crypto.createHash('sha256').update(userSeed + serverSeed).digest('hex').slice(0, 6); // 앞 6자리

    const message = `${random}|${userID}|${serverSeed}|${userSeed}`;
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');

    // draws 테이블에 기록
    try {
        await db.promise().query(
            'INSERT INTO draws (wallet_address, random, prop) VALUES (?, ?, ?)',
            [userID, random, signature]
        );
    } catch (err) {
        console.error('DB 기록 실패:', err);
        return res.status(500).json({ success: false, message: 'DB 저장 실패' });
    }

    console.log(`✅ REVEAL 완료 for ${userID} → ${random}`);
    return res.json({
        success: true,
        random,
        item: 'Devilgon',  // 실제로는 확률 기반 로직을 넣어도 좋음
        message,
        signature
    });
});
app.get('/drawHistory/:userID', async (req, res) => {
    const { userID } = req.params;
    try {
        const [rows] = await db.promise().query(
            'SELECT random, prop, created_at FROM draws WHERE wallet_address = ? ORDER BY created_at DESC',
            [userID]
        );

        const formatted = rows.map(row => {
            const random = row.random;
            const proof = row.prop;
            const message = `${random}|${userID}`; // 단일 서명이라면 이것만으로 충분
            return { random, proof, message };
        });

        return res.json({ success: true, draws: formatted });
    } catch (err) {
        console.error('drawHistory 오류:', err);
        return res.status(500).json({ success: false, message: '서버 오류' });
    }
});

// 정적 파일 서빙
app.use(express.static(path.join(__dirname, '../client')));

app.listen(PORT, HOST, () => {
    console.log(`Running on http://${HOST}:${PORT}`);
});
