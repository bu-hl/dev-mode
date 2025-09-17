// rest/server.js
const express = require('express');
const path = require('path');
const pool = require('./db');
const willRoutes = require('./routes'); // API 라우트 가져오기
const history = require('connect-history-api-fallback'); // SPA fallback용
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS 미들웨어 설정 수정
const corsOptions = {
  origin: 'http://localhost:3000', // 클라이언트의 출처를 명시적으로 지정
  credentials: true,             // 자격 증명 정보(쿠키 등) 허용
  optionsSuccessStatus: 200      // 일부 레거시 브라우저 호환성
};

app.use(cors(corsOptions)); // 수정된 CORS 설정 적용

// Preflight 요청을 명시적으로 처리할 필요가 있다면 (선택 사항이지만 권장)
// 모든 경로의 OPTIONS 요청에 대해 CORS 헤더를 응답하도록 설정
// app.options('*', cors(corsOptions)); 
// 참고: 위 app.use(cors(corsOptions)); 가 대부분의 preflight 요청을 처리하지만,
//       특정 라우터나 미들웨어 순서에 따라 명시적 app.options가 필요할 수도 있습니다.
//       일단은 app.use(cors(corsOptions)); 만으로 테스트해보시고, 
//       여전히 preflight 문제가 발생하면 app.options('*', cors(corsOptions)); 줄의 주석을 해제해보세요.


app.use('/', willRoutes); // <--- 이 옵션을 사용해야 현재 routes.js와 클라이언트의 '/will/register'가 맞습니다.


// 2. 정적 파일 제공을 위한 경로 설정
// ... (이하 기존 코드 동일) ...
const clientPaths = [
    path.join(__dirname, '..', 'client'),
];

let staticPathToServe = null;
for (const p of clientPaths) {
    if (require('fs').existsSync(p)) {
        staticPathToServe = p;
        break;
    }
}

// 3. SPA Fallback 미들웨어
if (staticPathToServe) {
    app.use(history({
        rewrites: [
            // API 경로 (/will/*)는 fallback 대상에서 제외해야 합니다.
            // 클라이언트의 요청이 /will/register 등이므로 이 패턴을 사용합니다.
            {
                from: /^\/will\/.*$/, // /will/ 로 시작하는 모든 경로는 API로 간주하여 제외
                to: function(context) {
                    return context.parsedUrl.pathname;
                }
            },
            // 만약 다른 API prefix (예: /auth/*, /admin/*)가 있다면 그것도 추가
            // 현재 /admin/wills API도 사용 중이므로 추가하는 것이 좋습니다.
            {
                from: /^\/auth\/.*$/, 
                to: function(context) { return context.parsedUrl.pathname; }
            },
            {
                from: /^\/admin\/.*$/, 
                to: function(context) { return context.parsedUrl.pathname; }
            }
            // 다른 API 엔드포인트 prefix가 있다면 여기에 추가
        ],
    }));
    // 4. 정적 파일 제공 미들웨어
    app.use(express.static(staticPathToServe));
    console.log(`Serving static files from ${staticPathToServe} with SPA fallback enabled.`);
} else {
    console.warn(`Client directory not found. Static file serving and SPA fallback disabled. Checked: ${clientPaths.join(', ')}`);
}

// 5. 중앙 에러 핸들링 미들웨어
app.use((err, req, res, next) => {
    console.error("Central Error Handler:", err.stack || err.message || err);
    const statusCode = err.status || 500;
    let message = err.message || 'An unexpected error occurred on the server.';

    if (process.env.NODE_ENV === 'production' && statusCode >= 500) {
        message = 'Internal Server Error. Please try again later.';
    }

    if (res.headersSent) {
        return next(err);
    }

    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV !== 'production' && err.cause && { cause: err.cause.toString() }),
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack ? err.stack.substring(0, 300) + '...' : undefined }),
    });
});

// 서버 시작
async function startServer() {
    try {
        await pool.query('SELECT 1');
        console.log("MariaDB connection pool is responsive.");

        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
            console.log("API routes are mounted.");
            if (staticPathToServe) {
                console.log("Static file serving and SPA fallback are active.");
            } else {
                console.warn("Static file serving for client application is NOT active (path not found).");
            }
        });
    } catch (error) {
        console.error("Failed to start the server or connect to critical services:", error);
        process.exit(1);
    }
}

startServer();