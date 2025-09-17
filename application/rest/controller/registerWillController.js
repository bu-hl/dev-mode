const willService = require('../service/registerWillService'); // 서비스 계층 모듈 임포트

// 유언장 등록 처리 (이미지 미포함)
async function registerWill(req, res, next) {
    const { title, originalContent, designatedViewers, testatorId } = req.body;

    // 기본적인 입력 값 검증 
    if (!title || !originalContent || !testatorId) {
        const error = new Error('Missing required fields: title, originalContent, and testatorId are required.');
        error.status = 400;
        return next(error);
    }

    // designatedViewers 유효성 검사 
    // 실제 내용은 서비스 계층이나 체인코드에서 검증
    if (designatedViewers && typeof designatedViewers !== 'string' && !Array.isArray(designatedViewers)) {
        const error = new Error('Invalid format for designatedViewers. It should be a JSON string or an array of {name, phone} objects.');
        error.status = 400;
        return next(error);
    }

    try {
        // 서비스 함수 호출 시 designatedViewers 전달
        const result = await willService.registerWillService(title, originalContent, designatedViewers, testatorId);
        res.status(201).json({
            message: 'Will registered successfully.',
            blockchainWillId: result.blockchainWillId,
            dbRecordId: result.dbRecordId
        });
    } catch (error) {
        console.error(`Controller Error in registerWill: ${error.message}`);
        next(error);
    }
}

// 유언장 등록 처리 (이미지 포함)
async function registerWillWithImage(req, res, next) {
    const { title, originalContent, designatedViewers, testatorId } = req.body; 
    const imageFiles = req.files; 

    // 기본적인 텍스트 입력 값 검증
    if (!title || !originalContent || !testatorId) {
        const error = new Error('Missing required text fields: title, originalContent, and testatorId are required.');
        error.status = 400;
        return next(error);
    }

    // 이미지 파일 배열 기본 존재 유무 검증
    if (!imageFiles || imageFiles.length === 0) {
        const error = new Error('At least one image file is required.');
        error.status = 400;
        return next(error);
    }

    // designatedViewers 유효성 검사
    if (designatedViewers && typeof designatedViewers !== 'string') {
        const error = new Error('Invalid format for designatedViewers. When sending as FormData, it should be a JSON string representing an array of {name, phone} objects.');
        error.status = 400;
        return next(error);
    }
    // 빈 문자열이나 "[]"도 유효한 값으로 간주 (서비스에서 처리)

    try {
        // 서비스 함수 호출 시 designatedViewers (문자열)와 imageFiles 전달
        const result = await willService.registerWillWithImagesService(
            title,
            originalContent,
            designatedViewers, // FormData로 받으면 문자열 형태일 것임
            testatorId,
            imageFiles 
        );
        res.status(201).json({ 
            message: 'Will with image(s) registered successfully.',
            blockchainWillId: result.blockchainWillId, 
            dbRecordId: result.dbRecordId             
        });
    } catch (error) {
        console.error(`Controller Error in registerWillWithImage: ${error.message}`);
        next(error);
    }
}

module.exports = {
    registerWill,
    registerWillWithImage,
};