const pool = require('../db');
const sdk = require('../sdk'); 
const getWillService = require('../service/getWillService'); // 서비스 파일 임포트

// 관리자 권한 체크 함수
async function isNotAdmin(req) {
    let usernameForCheck;

    // 1. req.user.username 확인 (Passport 등 표준적인 인증 라이브러리 사용 시)
    if (req.user && req.user.username) {
        usernameForCheck = req.user.username;
        console.log(`isNotAdmin: Found username in req.user.username: ${usernameForCheck}`);
    } 
    // 2. req.session.username 확인 (서버 측 세션에 직접 저장한 경우)
    else if (req.session && req.session.username) {
        usernameForCheck = req.session.username;
        console.log(`isNotAdmin: Found username in req.session.username: ${usernameForCheck}`);
    }
    // 3. 커스텀 헤더 'x-user-username' 확인 (클라이언트가 헤더에 직접 실어 보낸 경우)
    else if (req.headers && req.headers['x-user-username']) {
        usernameForCheck = req.headers['x-user-username'];
        console.log(`isNotAdmin: Found username in 'x-user-username' header: ${usernameForCheck}`);
    }
    // 4. 어디에도 사용자 이름 정보가 없는 경우
    else {
        console.warn('isNotAdmin: Username not found in req.user, req.session, or x-user-username header. Assuming not an admin.');
        return true; // 사용자 정보가 없으면 관리자가 아닌 것으로 간주
    }

    console.log(`isNotAdmin: Checking admin status for user: ${usernameForCheck}`);

    try {
        const query = 'SELECT role FROM Users WHERE email = ?';
        const [rows] = await pool.execute(query, [usernameForCheck]);

        if (rows.length === 0) {
            console.warn(`isNotAdmin: User '${usernameForCheck}' not found in database. Assuming not an admin.`);
            return true;
        }

        const userRole = rows[0].role;
        if (userRole === 'NOTARY') {
            console.info(`isNotAdmin: User '${usernameForCheck}' has role '${userRole}'. Returning false (is an admin).`);
            return false; // 관리자이므로 false 반환
        } else {
            console.info(`isNotAdmin: User '${usernameForCheck}' has role '${userRole}'. Returning true (is not an admin).`);
            return true; // 관리자가 아니므로 true 반환
        }
    } catch (error) {
        console.error(`isNotAdmin: Error querying database for user '${usernameForCheck}':`, error);
        return true; // DB 오류 시 안전하게 관리자가 아닌 것으로 처리
    }
}

// ... (getAllUsers, deleteUser, getAllWills, getWillDetailById, updateWillMetaStatus 함수 및 module.exports는 기존 코드 유지) ...
// 전체 사용자 목록 조회
async function getAllUsers(req, res) {
    if (isNotAdmin(req)) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });

    try {
        console.log('[👤 사용자 목록 요청]');
        const [rows] = await pool.execute('SELECT * FROM Users');
        console.log(`[사용자 수] ${rows.length}명`);
        res.json(rows);
    } catch (err) {
        console.error('[ getAllUsers 실패]:', err);
        res.status(500).json({ error: '전체 사용자 불러오기 실패' });
    }
}

// 사용자 삭제
async function deleteUser(req, res) {
    if (isNotAdmin(req)) return res.status(403).json({ error: '관리자 권한이 필요합니다.' });

    const { username } = req.params;
    if (!username) return res.status(400).json({ error: 'username이 필요합니다.' });

    try {
        console.log(`[사용자 삭제 시도] ${username}`);
        const [result] = await pool.execute('DELETE FROM Users WHERE username = ?', [username]);
        if (result.affectedRows === 0) {
            console.log('[ 사용자 없음]');
            return res.status(404).json({ error: '사용자 없음' });
        }
        console.log('[ 사용자 삭제 성공]');
        res.json({ message: '사용자 삭제 성공' });
    } catch (err) {
        console.error('[ deleteUser 실패]:', err);
        res.status(500).json({ error: '사용자 삭제 실패' });
    }
}

// 전체 유언장 목록 조회
async function getAllWills(req, res) {
    let logUsername = 'N/A';
        if (req.user && req.user.username) {
        logUsername = req.user.username;
    } else if (req.session && req.session.username) {
        logUsername = req.session.username + " (from session)";
    }
    console.log(`getAllWills called by user: ${logUsername}`);

    if (await isNotAdmin(req)) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    let connection; // DB 연결 변수

    try {
        console.log('[📜 전체 유언장 목록 조회 요청 (관리자)]');

        const chaincodeFunction = 'GetAllWillsByAdmin';
        const adminChaincodeToken = "admin";
        const chaincodeArgs = [adminChaincodeToken];

        console.log(`Calling chaincode '${chaincodeFunction}' with args: ${JSON.stringify(chaincodeArgs)} using SDK user '${process.env.FABRIC_USER_ID || 'appUser'}'`);
        
        const resultBuffer = await sdk.send(true, chaincodeFunction, chaincodeArgs);

        if (!resultBuffer || resultBuffer.length === 0) {
            console.warn(`[getAllWills] Chaincode function '${chaincodeFunction}' returned no result or an empty buffer.`);
            return res.status(200).json([]);
        }
        
        const allWillsFromChaincode = JSON.parse(resultBuffer.toString('utf8'));

        if (!Array.isArray(allWillsFromChaincode) || allWillsFromChaincode.length === 0) {
            console.log(`[전체 유언장 수] 0건 (체인코드 반환 값 없음 또는 빈 배열)`);
            return res.json([]);
        }

        console.log(`[체인코드로부터 받은 유언장 수] ${allWillsFromChaincode.length}건`);

        connection = await pool.getConnection();
        const enrichedWills = [];

        for (const bcWill of allWillsFromChaincode) {
            const willDbId = bcWill.offChainStorageRef; 
            let originalTitle = null;
            let originalTestatorUsername = null;
            let originalCreatedAt = bcWill.createdAt; // 기본값은 체인코드의 값으로 설정

            if (willDbId) {
                try {
                    // Wills 테이블의 testator_id와 Users 테이블의 id를 조인하고, Wills 테이블의 created_at을 가져옵니다.
                    const query = `
                        SELECT 
                            w.title AS originalTitle,
                            w.created_at AS originalCreatedAt, 
                            u.email AS originalTestatorUsername 
                        FROM Wills w
                        LEFT JOIN Users u ON w.testator_id = u.email 

                        WHERE w.id = ? 
                    `;
                    
                    const [rows] = await connection.execute(query, [willDbId]);
                    if (rows.length > 0) {
                        originalTitle = rows[0].originalTitle;
                        originalTestatorUsername = rows[0].originalTestatorUsername;
                        originalCreatedAt = rows[0].originalCreatedAt; // DB에서 가져온 생성일로 업데이트
                    } else {
                        console.warn(`[getAllWills] DB에서 willDbId ${willDbId}에 해당하는 유언장 정보를 찾을 수 없습니다.`);
                    }
                } catch (dbError) {
                    console.error(`[getAllWills] DB 조회 중 오류 (willDbId: ${willDbId}): ${dbError.message}`);
                }
            } else {
                console.warn(`[getAllWills] 체인코드 유언장 데이터에 offChainStorageRef가 없습니다:`, bcWill);
            }

            enrichedWills.push({
                ...bcWill, // 체인코드 데이터 (여기에도 createdAt이 있을 수 있음)
                originalTitle: originalTitle,
                originalTestatorUsername: originalTestatorUsername,
                createdAt: originalCreatedAt // DB의 created_at을 우선적으로 사용 (또는 originalCreatedAt 필드명 사용 결정)
                                            // 프론트엔드에서 createdAt을 사용하고 있으므로, 이 필드명을 DB 값으로 덮어쓰거나
                                            // 프론트엔드를 수정하여 originalCreatedAt을 사용하도록 할 수 있습니다.
                                            // 여기서는 createdAt을 DB 값으로 덮어쓰는 것으로 가정합니다.
            });
        }
        
        if (connection) connection.release();

        console.log(`[최종 반환 유언장 수 (원본 정보 포함)] ${enrichedWills.length}건`);
        res.json(enrichedWills);

    } catch (error) {
        if (connection) connection.release();
        console.error(`[getAllWills 실패]: ${error.message}`);
        const statusCode = error.status || 500;
        const errorMessage = error.message || '전체 유언장 목록 조회 중 서버 오류 발생';
        res.status(statusCode).json({ error: errorMessage });
    }
}


async function getWillDetailById(req, res) {
    let logUsername = 'N/A';
    // ... (기존 사용자 로깅 부분 유지) ...
    if (req.user && req.user.username) {
        logUsername = req.user.username;
    } else if (req.session && req.session.username) {
        logUsername = req.session.username + " (from session)";
    } else if (req.headers && req.headers['x-user-username']){
        logUsername = req.headers['x-user-username'] + " (from X-User-Username header)";
    }
    console.log(`getWillDetailById (admin) called by user: ${logUsername}, for willId (hashed): ${req.params.willId}`);


    if (await isNotAdmin(req)) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    const { willId } = req.params; // 이 willId는 체인코드에 저장된 해시된 ID여야 함
    if (!willId) {
        return res.status(400).json({ error: 'willId 파라미터(해시된 유언장 ID)가 필요합니다.' });
    }

    try {
        console.log(`[📜 특정 유언장 상세 조회 요청 (관리자)] Hashed ID: ${willId}`);

        // 서비스 계층의 새로운 함수 호출
        const comprehensiveWillDetails = await getWillService.getWillDetailsForAdminService(willId);

        console.log(`[특정 유언장 상세 정보 조회 성공 (관리자)] Hashed ID: ${willId}`);
        res.json(comprehensiveWillDetails);

    } catch (error) {
        console.error(`[getWillDetailById (admin) 실패] Hashed ID: ${willId}: ${error.message || error}`);
        const statusCode = error.status || 500; // 서비스에서 status를 설정해줄 것임
        const errorMessage = error.message || `ID가 ${willId}인 유언장 상세 정보 조회 중 서버 오류 발생`;
        res.status(statusCode).json({ error: errorMessage });
    }
}


// 유언장 상태(사망 여부) 승인/거절 업데이트
async function updateWillStatusByAdmin(req, res) {
    let logUsername = 'N/A';
    if (req.user && req.user.username) {
        logUsername = req.user.username;
    } else if (req.session && req.session.username) {
        logUsername = req.session.username + " (from session)";
    }
    console.log(`updateWillStatusByAdmin called by user: ${logUsername}`);

    // 1. 관리자 권한 확인
    if (await isNotAdmin(req)) {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }

    // 2. 파라미터 및 요청 본문에서 값 추출
    const { willId } = req.params; // URL 경로에서 해시된 유언장 ID 추출
    const { newStatus } = req.body;  // 요청 본문에서 새로운 상태 값 추출

    if (!willId) {
        return res.status(400).json({ error: 'willId 파라미터(해시된 유언장 ID)가 필요합니다.' });
    }
    if (!newStatus) {
        return res.status(400).json({ error: '요청 본문에 newStatus 필드가 필요합니다.' });
    }

  

    try {
        console.log(`[유언장 상태 변경 요청 (관리자)] Hashed ID: ${willId}, New Status: ${newStatus}`);

        // 3. 서비스 함수 호출 (getWillService에 추가할 함수)
        const resultMessage = await getWillService.updateWillStatusByAdminService(willId, newStatus);

        console.log(`[유언장 상태 변경 성공 (관리자)] Hashed ID: ${willId}, Result: ${resultMessage}`);
        res.json({ message: resultMessage, willId: willId, newStatus: newStatus });

    } catch (error) {
        console.error(`[updateWillStatusByAdmin 실패] Hashed ID: ${willId}: ${error.message || error}`);
        const statusCode = error.status || 500; // 서비스 함수에서 status를 설정할 수 있음
        const errorMessage = error.message || `ID가 ${willId}인 유언장의 상태를 ${newStatus}(으)로 변경 중 서버 오류 발생`;
        res.status(statusCode).json({ error: errorMessage });
    }
}


module.exports = {
    getAllUsers,
    deleteUser,
    getAllWills,
    getWillDetailById,
    updateWillStatusByAdmin
};
