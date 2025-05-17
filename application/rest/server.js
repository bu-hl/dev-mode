// server.js
const express = require('express');
const mysql = require('mysql2/promise');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const sdk = require('./sdk'); // 귀하의 sdk.js 파일

const app = express();
const PORT = 8001;
const HOST = '0.0.0.0';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbConfig = {
    host: 'svc.sel4.cloudtype.app',
    port: 30987,
    user: 'root',
    password: '1',
    database: 'block'
};

const ENCRYPTION_KEY_HEX = '1eb81515f8a41062210838ed8bfa294ed58d67ffb8c902c2b281efc30c5451df'; // <<<< 실제 키로 교체!!!

if (ENCRYPTION_KEY_HEX === '여기에_생성한_64자리_16진수_키_문자열을_넣으세요' || ENCRYPTION_KEY_HEX.length !== 64) {
    console.error("CRITICAL ERROR: ENCRYPTION_KEY_HEX is not set or has an invalid length.");
    process.exit(1);
}

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
const IV_LENGTH = 12;

function encrypt(text) {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted, authTag: authTag };
}

function decrypt(encryptedPayload) {
    try {
        const iv = Buffer.from(encryptedPayload.iv, 'hex');
        const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Decryption failed:", error.message);
        return null;
    }
}

function calculateHash(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
}

let pool;
(async () => {
    try {
        pool = mysql.createPool(dbConfig);
        // Test the connection
        const connection = await pool.getConnection();
        console.log("Successfully connected to MariaDB pool and tested connection.");
        connection.release();
    } catch (error) {
        console.error("Failed to create or test MariaDB connection pool:", error);
        process.exit(1);
    }
})();


app.post('/will/register', async (req, res) => {
    const { title, originalContent, beneficiaries, testatorId } = req.body;

    if (!title || !originalContent || !testatorId) {
        return res.status(400).json({ error: 'Missing required parameters: title, originalContent, and testatorId are required.' });
    }

    try {
        const contentHash = calculateHash(originalContent);
        const encryptedPayload = encrypt(originalContent);

        if (!encryptedPayload.iv || !encryptedPayload.encryptedData || !encryptedPayload.authTag) {
            console.error("Encryption resulted in incomplete payload:", encryptedPayload);
            return res.status(500).json({ error: 'Failed to encrypt will content correctly.' });
        }

        const willDbId = uuidv4(); // This will be our offChainStorageRef
        const insertQuery = `
            INSERT INTO Wills (id, testator_id, encrypted_content, encryption_iv, encryption_auth_tag)
            VALUES (?, ?, ?, ?, ?)
        `;
        await pool.execute(insertQuery, [
            willDbId,
            testatorId,
            encryptedPayload.encryptedData,
            encryptedPayload.iv,
            encryptedPayload.authTag
        ]);
        console.log(`Will content stored in MariaDB with ID (offChainStorageRef): ${willDbId}`);

        const beneficiariesJSON = JSON.stringify(beneficiaries || []);
        const offChainStorageRef = willDbId;

        const args = [
            String(title),
            String(contentHash),
            String(offChainStorageRef),
            String(beneficiariesJSON)
            // 체인코드의 RegisterWill 함수가 testatorId를 인자로 받는다면 추가: String(testatorId)
        ];
        console.log(`Invoking chaincode 'RegisterWill' with args: ${JSON.stringify(args)}`);

        // sdk.send 호출 (submitTransaction)
        // 체인코드가 생성된 willID를 반환한다고 가정
        const chaincodeResponseBuffer = await sdk.send(false, 'RegisterWill', args);

        let blockchainWillId = "";
        if (chaincodeResponseBuffer && chaincodeResponseBuffer.length > 0) {
            blockchainWillId = chaincodeResponseBuffer.toString();
            console.log(`Transaction 'RegisterWill' submitted successfully. Blockchain Will ID: ${blockchainWillId}`);
        } else {
            console.warn(`Transaction 'RegisterWill' submitted, but no specific ID returned from chaincode.`);
        }

        // 클라이언트에 성공 응답 (블록체인 ID와 DB ID 포함)
        res.status(201).json({
            message: `Will registered successfully.`,
            blockchainWillId: blockchainWillId, // 체인코드에서 반환된 실제 Will ID
            dbRecordId: willDbId            // MariaDB에 저장된 ID (offChainStorageRef)
        });

    } catch (error) {
        console.error('Error during will registration process:', error.stack || error);
        const statusCode = error.status || 500;
        if (!res.headersSent) {
            res.status(statusCode).json({
                error: 'Failed to process will registration.',
                details: error.message
            });
        }
    }
});

app.get('/will/mywills', async (req, res) => {
    console.log("Received /will/mywills (GetMyWills) request.");
    try {
        // sdk.send의 isQuery=true는 결과를 반환 (res 객체 전달 안함)
        const resultBuffer = await sdk.send(true, 'GetMyWills', []);
        if (resultBuffer && resultBuffer.length > 0) {
            res.json(JSON.parse(resultBuffer.toString()));
        } else {
            res.json([]); // 빈 배열 반환
        }
    } catch (error) {
        console.error('Error in GetMyWills:', error.stack || error);
        const statusCode = error.status || 500;
        if (!res.headersSent) {
            res.status(statusCode).json({ error: 'Failed to execute GetMyWills.', details: error.message });
        }
    }
});


app.get('/will/details/:willId', async (req, res) => {
    const { willId } = req.params; // This should be the BLOCKCHAIN Will ID

    if (!willId) {
        return res.status(400).json({ error: 'Missing required parameter: willId (Blockchain Will ID) is required.' });
    }

    try {
        console.log(`Fetching details from blockchain for will ID: ${willId}`);
        // 1. 블록체인에서 메타데이터 가져오기
        const blockchainDataBuffer = await sdk.send(true, 'GetWillDetails', [String(willId)]);

        if (!blockchainDataBuffer || blockchainDataBuffer.length === 0) {
            return res.status(404).json({ error: `Will with ID ${willId} not found on blockchain (or empty response).` });
        }

        let blockchainWill;
        try {
            blockchainWill = JSON.parse(blockchainDataBuffer.toString());
        } catch (parseError) {
            console.error("Failed to parse blockchain response:", parseError, "Raw data:", blockchainDataBuffer.toString());
            return res.status(500).json({ error: 'Failed to parse will data from blockchain.' });
        }

        if (!blockchainWill || !blockchainWill.contentHash || !blockchainWill.offChainStorageRef) {
            console.error("Blockchain data missing crucial fields (contentHash or offChainStorageRef):", blockchainWill);
            return res.status(500).json({ error: 'Incomplete will data from blockchain. Missing hash or DB reference.' });
        }

        const { contentHash: storedHash, offChainStorageRef: dbRecordId } = blockchainWill;

        // 2. MariaDB에서 암호화된 내용 가져오기
        console.log(`Fetching encrypted content from MariaDB for record ID (offChainStorageRef): ${dbRecordId}`);
        const selectQuery = `SELECT encrypted_content, encryption_iv, encryption_auth_tag FROM Wills WHERE id = ?`;
        const [rows] = await pool.execute(selectQuery, [dbRecordId]);

        if (rows.length === 0) {
            return res.status(404).json({ error: `Will content not found in database for reference: ${dbRecordId}` });
        }
        const dbRow = rows[0];
        const encryptedPayloadFromDb = {
            iv: dbRow.encryption_iv,
            encryptedData: dbRow.encrypted_content,
            authTag: dbRow.encryption_auth_tag
        };

        // 3. 복호화
        const decryptedContent = decrypt(encryptedPayloadFromDb); // `decrypt` 함수는 server.js 상단에 정의되어 있음
        if (decryptedContent === null) {
            return res.status(500).json({ error: 'Failed to decrypt will content. Data might be corrupted or key is incorrect.' });
        }

        // 4. 무결성 검증
        const currentHash = calculateHash(decryptedContent); // `calculateHash` 함수는 server.js 상단에 정의되어 있음
        if (currentHash !== storedHash) {
            console.warn(`Data integrity check failed for will ${willId}. Stored hash: ${storedHash}, Current hash: ${currentHash}`);
            return res.status(500).json({
                error: 'Data integrity check failed. The will content may have been tampered with after registration.',
            });
        }

        console.log(`Data integrity check passed for will ${willId}.`);

        // 5. 클라이언트에 응답 (메타데이터 + 복호화된 원문)
        res.json({
            ...blockchainWill, // 블록체인에서 가져온 메타데이터
            originalContent: decryptedContent // 복호화된 원문 내용
        });

    } catch (error) {
        console.error(`Error fetching details for will ${willId}:`, error.stack || error);
        const statusCode = error.status || 500;
        let errorMessage = error.message || 'Failed to fetch will details.';
        if (errorMessage.includes('does not exist')) {
            return res.status(404).json({ error: errorMessage });
        }
        if (!res.headersSent) {
            res.status(statusCode).json({ error: 'Failed to fetch will details.', details: errorMessage });
        }
    }
});

// 정적 파일 제공 경로 설정 (기존 코드 유지)
const clientPaths = [
    path.join(__dirname, '../client'),
    path.join(__dirname, '..', 'client'), // For dev-mode structure
    path.join(__dirname, 'client')      // For other structures
];'use strict';

const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');

const channelName = 'channel1';
const chaincodeName = 'abstore';

const walletPath = path.join(process.cwd(), '..', 'wallet');
const ccpPath = path.resolve(__dirname, '..', 'connection-org1.json');
const org1UserId = 'appUser';
async function send(type, func, args, res, result){
    try {
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        const gateway = new Gateway();

        try {
            await gateway.connect(ccp, {
                wallet,
                identity: org1UserId,
                discovery: { enabled: true, asLocalhost: false }
            });
            console.log('Success to connect network');

            const network = await gateway.getNetwork(channelName);
            console.log('Success to connect channel1');
            const contract = network.getContract(chaincodeName);

            if(type){
                result = await contract.evaluateTransaction(func, ...args);
                res.json(result.toString());
            } else {
                result = await contract.submitTransaction(func, ...args);
                res.json("Success");
            }
            

        } catch (error) {
            res.status(500).send({ error: `${error}`});
        } finally {
            gateway.disconnect();
        }
    } catch (error) {
        res.status(500).send({ error: `${error}`});
    }
}
module.exports = {
    send:send
}


let clientPathFound = false;
for (const p of clientPaths) {
    if (require('fs').existsSync(p)) {
        app.use(express.static(p));
        console.log(`Serving static files from ${p}`);
        clientPathFound = true;
        break;
    }
}
if (!clientPathFound) {
    console.warn(`Client directory not found in expected locations. Static file serving might not work.`);
}


app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    if (ENCRYPTION_KEY_HEX !== '여기에_생성한_64자리_16진수_키_문자열을_넣으세요' && ENCRYPTION_KEY_HEX.length === 64) {
        console.log("ENCRYPTION_KEY seems to be set correctly.");
    } else {
        console.warn("WARNING: ENCRYPTION_KEY might not be set correctly or is using the placeholder. Check server.js.");
    }
    console.log("Make sure your MariaDB connection details are correctly set.");
    console.log("Ensure the 'Wills' table exists in your MariaDB database with the correct schema.");
});