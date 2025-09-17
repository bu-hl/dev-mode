const willService = require('../service/getWillService'); // 서비스 계층 모듈 임포트

// (로그인된 사용자의) 내 유언장 목록 조회 처리
async function getMyWills(req, res, next) {
    const { username } = req.query; 

    // 컨트롤러: username 필수 파라미터 유효성 검사
    if (!username) {
        // username이 제공되지 않은 경우 에러 응답
        const error = new Error("Username is required as a query parameter.");
        error.status = 400;
        return next(error);
    }

    try {
        console.log(`Controller: Received request for getMyWills for username: ${username}`);
        const myWills = await willService.getMyWillsService(username); 
        res.status(200).json(myWills);
    } catch (error) {
        console.error(`Controller Error in getMyWills for username ${username}: ${error.message}`);
        next(error); 
    }
}
// 내가 지정 열람자로 되어 있는 유언장 목록 조회 컨트롤러
async function getDesignatedViewersWills(req, res, next) {
    try {
        const { username } = req.query;

        if (!username) {
            const error = new Error("쿼리 파라미터로 사용자 이름(username)을 제공해야 합니다.");
            error.status = 400;
            return next(error);
        }

        console.log(`Controller: Request received for getDesignatedViewersWills by user '${username}' (from query param)`);
        // 'getWillService' 대신 'willService' 사용
        const wills = await willService.getWillsViewableByUserService(username);
        
        res.json(wills);

    } catch (error) {
        console.error(`Controller Error in getDesignatedViewersWills for user ${req.query.username || 'unknown'}: ${error.message}`);
        next(error);
    }
}
// 특정 유언장 상세 정보 조회 처리
async function getWillDetails(req, res, next) {
    const { willId } = req.params; 
    const { username } = req.query; 

    // 컨트롤러: willId (경로 파라미터) 유효성 검사
    if (!willId) {
        // 이 경우는 보통 Express 라우팅 설정에 의해 willId가 없으면 매칭되지 않지만, 명시적으로 확인 가능
        const error = new Error('Will ID (from blockchain) is required in the URL path.');
        error.status = 400;
        return next(error);
    }

    // 컨트롤러: username (쿼리 파라미터) 유효성 검사
    if (!username) {
        const error = new Error('Username is required as a query parameter to get will details.');
        error.status = 400;
        return next(error);
    }

    try {
        console.log(`Controller: Received request for getWillDetails. Will ID: ${willId}, Username: ${username}`);
        const willDetails = await willService.getWillDetailsService(willId, username);
        res.status(200).json(willDetails);
    } catch (error) {
        console.error(`Controller Error in getWillDetails for ID ${willId}, User ${username}: ${error.message}`);
        next(error);
    }
}

// 이미지 직접 제공 컨트롤러
async function getWillImage(req, res, next) {
    const { imageRecordId } = req.params; 

    // 컨트롤러: imageRecordId (경로 파라미터) 유효성 검사
    if (!imageRecordId) {
        // 이 경우도 Express 라우팅 설정에 의해 imageRecordId가 없으면 매칭되지 않지만, 명시적으로 확인 가능
        const error = new Error('Image record ID is required in the URL path.');
        error.status = 400;
        return next(error);
    }

    try {
        const { buffer, mimeType, fileName } = await willService.getWillImageService(imageRecordId);
        res.setHeader('Content-Type', mimeType);
        res.send(buffer);
    } catch (error) {
        console.error(`Controller Error in getWillImage for ImageRecordID ${imageRecordId}: ${error.message}`);
        next(error);
    }
}

module.exports = {
    getMyWills,
    getWillDetails,
    getWillImage,
    getDesignatedViewersWills
};