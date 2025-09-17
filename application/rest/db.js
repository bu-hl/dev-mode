// rest/db.js
const mysql = require('mysql2/promise');

// 데이터베이스 접속 정보
// 실제 운영 환경에서는 환경 변수를 통해 설정하는 것이 안전하고 바람직합니다.
const dbConfig = {
    host: process.env.DB_HOST || 'svc.sel4.cloudtype.app',
    port: parseInt(process.env.DB_PORT || '30987', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1', // 중요: 실제 운영 시 환경 변수로 관리하세요.
    database: process.env.DB_NAME || 'block',
    waitForConnections: true,
    connectionLimit: process.env.DB_CONNECTION_LIMIT ? parseInt(process.env.DB_CONNECTION_LIMIT, 10) : 10,
    queueLimit: 0
};

let pool;

try {
    pool = mysql.createPool(dbConfig);
    console.log(`Successfully created MariaDB connection pool for ${dbConfig.database}@${dbConfig.host}.`);
} catch (error) {
    console.error("FATAL ERROR: Failed to create MariaDB connection pool. Application will not be able to connect to the database.", error);
    // 풀 생성 실패는 심각한 문제이므로, 에러를 다시 throw하여
    // 애플리케이션 시작 과정(server.js)에서 인지하고 중단되도록 합니다.
    throw error;
}

module.exports = pool;