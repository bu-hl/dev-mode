const crypto = require('crypto');


const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY_HEX || '1eb81515f8a41062210838ed8bfa294ed58d67ffb8c902c2b281efc30c5451df';
let ENCRYPTION_KEY;
if (ENCRYPTION_KEY) {
    console.log("ENCRYPTION_KEY (Buffer length):", ENCRYPTION_KEY.length); // 32바이트여야 함
}
if (!ENCRYPTION_KEY_HEX || ENCRYPTION_KEY_HEX.length !== 64) {
    console.error("CRITICAL ERROR: ENCRYPTION_KEY_HEX is not set correctly.");
} else {
    ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');
    console.log("Encryption key loaded successfully in service.js.");
}
const IV_LENGTH = 12;


function encrypt(text) {
    if (!ENCRYPTION_KEY) {
        throw new Error("Encryption key is not configured. Cannot encrypt data.");
    }
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return { iv: iv.toString('hex'), encryptedData: encrypted, authTag: authTag };
}

function decrypt(encryptedPayload) {
    if (!ENCRYPTION_KEY) {
        throw new Error("Encryption key is not configured. Cannot decrypt data.");
    }
    try {
        const iv = Buffer.from(encryptedPayload.iv, 'hex');
        const authTag = Buffer.from(encryptedPayload.authTag, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedPayload.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Decryption failed in service.js:", error.message);
        // 복호화 실패는 중요한 문제이므로 null 반환 대신 에러 throw 고려
        const decryptError = new Error("Failed to decrypt data. It may be corrupted or the key is incorrect.");
        decryptError.status = 500; // 내부 서버 오류
        decryptError.cause = error;
        throw decryptError;
    }
}

function calculateHash(inputData) { // 파라미터 이름을 inputData 등으로 변경
    return crypto.createHash('sha256').update(inputData).digest('hex'); // 변경된 파라미터 이름 사용
}



module.exports = {
    encrypt,
    decrypt,
    calculateHash
};