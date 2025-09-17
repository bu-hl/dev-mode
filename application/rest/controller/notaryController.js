// application/rest/controller/notaryController.js
const notaryService = require('../service/notaryService'); // 새로운 서비스 함수들을 포함

/**
 * "자신의" 공증인 홍보 정보를 가져옵니다.
 * 클라이언트가 쿼리 파라미터로 username(email)을 제공해야 합니다.
 */
async function getOwnNotaryDetails(req, res, next) {
    const { username } = req.query; // 클라이언트에서 보낸 username (email)

    if (!username) {
        return res.status(400).json({ error: '쿼리 파라미터로 username을 제공해야 합니다.' });
    }

    try {
        console.log(`[CONTROLLER getOwnNotaryDetails] 사용자 email '${username}'의 공증인 홍보 정보 조회 요청`);
        
        // 1. username(email)으로 Users 테이블에서 실제 PK (actualUserId) 조회
        const userProfile = await notaryService.getUserProfileForNotaryPage(username, 'email');
        if (!userProfile || !userProfile.actualUserId) {
            return res.status(404).json({ message: `사용자 이메일 '${username}'에 해당하는 공증인 정보를 찾을 수 없습니다.` });
        }
        const actualUserId = userProfile.actualUserId; // Users 테이블의 PK

        // 2. 실제 PK를 사용하여 NotaryPromotions 정보 (+ Users 정보 일부) 조회
        const promotionInfo = await notaryService.getPromotionByUserId(actualUserId);

        if (!promotionInfo) {
            // 이 경우는 getUserProfileForNotaryPage에서 이미 사용자를 찾았으므로,
            // getPromotionByUserId가 null을 반환했다면 Users는 있지만 Promotions가 없는 경우임.
            // getPromotionByUserId 내부에서 이미 Users 정보를 포함하여 반환하므로, 별도 처리 불필요할 수 있음.
            // (서비스 로직에 따라 반환값이 userProfile 정보만 포함할 수 있으니, 프론트엔드와 약속 필요)
            console.log(`[CONTROLLER getOwnNotaryDetails] 공증인 홍보 정보는 없으나, 사용자 '${username}' (PK: ${actualUserId})는 존재함.`);
            // 서비스의 getPromotionByUserId가 Users 정보만 포함된 객체를 반환하도록 설계했으므로 그대로 사용
             return res.status(200).json({
                userId: actualUserId,
                email: userProfile.userEmail,
                userName: userProfile.userName,
                userCompanyName: userProfile.userCompanyName,
                userPhoneNumber: userProfile.userPhoneNumber,
                company_phone: null,
                consultation_phone: null,
                phone_consultation_fee: null,
                visit_consultation_fee: null,
                tags: [],
                description: null,
                message: '공증인 홍보 정보는 아직 등록되지 않았습니다.'
            });
        }
        
        res.status(200).json(promotionInfo); // Users 정보와 Promotions 정보가 결합된 객체

    } catch (error) {
        console.error(`[CONTROLLER getOwnNotaryDetails 실패] 사용자 email '${username}':`, error.message);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || '공증인 홍보 정보 조회 중 서버 오류 발생' });
    }
}

/**
 * "자신의" 공증인 홍보 정보를 생성하거나 업데이트합니다 (UPSERT).
 * 클라이언트가 요청 본문에 username (requestingUsername)과 홍보 데이터를 포함해야 합니다.
 */
async function upsertOwnNotaryDetails(req, res, next) {
    const { requestingUsername, ...promotionDataFromClient } = req.body;
    const userEmail = requestingUsername;

    if (!userEmail) {
        return res.status(400).json({ error: "요청 본문에 'requestingUsername'(사용자 이메일)이 필요합니다." });
    }

    try {
        console.log(`[CONTROLLER upsertOwnNotaryDetails] 사용자 email '${userEmail}'의 공증인 홍보 정보 저장/업데이트 요청`);
        console.log('[CONTROLLER upsertOwnNotaryDetails] promotionDataFromClient:', promotionDataFromClient);

        // 1. userEmail을 사용하여 Users 테이블에서 실제 userId (PK)를 조회
        const user = await notaryService.getUserProfileForNotaryPage(userEmail, 'email');
        if (!user || !user.actualUserId) {
            return res.status(404).json({ error: `사용자 이메일 '${userEmail}'에 해당하는 공증인을 찾을 수 없습니다.` });
        }
        const actualUserId = user.actualUserId; // Users 테이블의 PK
        console.log(`[CONTROLLER upsertOwnNotaryDetails] 실제 사용자 PK: ${actualUserId} (for email: ${userEmail})`);

        // 2. 실제 PK와 클라이언트에서 받은 홍보 데이터(필드명 일치)를 서비스로 전달
        const result = await notaryService.upsertPromotionByUserId(actualUserId, promotionDataFromClient);
        
        res.status(200).json({ message: '공증인 홍보 정보가 성공적으로 저장/업데이트되었습니다.', data: result });

    } catch (error) {
        console.error(`[CONTROLLER upsertOwnNotaryDetails 실패] 사용자 email '${userEmail}':`, error.message);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || '공증인 홍보 정보 처리 중 서버 오류 발생' });
    }
}

async function getAllPublicPromotions(req, res, next) {
    try {
        console.log('[CONTROLLER getAllPublicPromotions] 모든 활성 공증인 홍보 목록 조회 요청');
        const promotions = await notaryService.getAllActivePromotions();
        res.status(200).json(promotions);
    } catch (error) {
        console.error('[CONTROLLER getAllPublicPromotions 실패]:', error.message);
        const statusCode = error.status || 500;
        res.status(statusCode).json({ error: error.message || '공증인 홍보 목록 조회 중 서버 오류 발생' });
    }
}

module.exports = {
    getOwnNotaryDetails,
    upsertOwnNotaryDetails,
    getAllPublicPromotions};