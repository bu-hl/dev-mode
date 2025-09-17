// application/rest/ocrController.js
const ocrService = require('../service/ocrService'); // ocrService 모듈 임포트

// Vision API 클라이언트 직접 초기화 로직은 ocrService.js로 이동했으므로 여기서는 제거

const extractText = async (req, res, next) => {
  // 파일 존재 유무 및 기본 유효성 검사는 컨트롤러에서 수행
  if (!req.file) {
    // Multer에서 파일이 없으면 req.file이 undefined일 수 있음
    return res.status(400).json({ error: "파일이 업로드되지 않았습니다." });
  }
  if (!req.file.buffer || req.file.buffer.length === 0) {
    return res.status(400).json({ error: "업로드된 파일에 데이터가 없습니다." });
  }

  try {
    const imageBuffer = req.file.buffer;
    // 서비스 계층의 함수 호출
    const extractedText = await ocrService.extractTextFromImageService(imageBuffer);

    res.json({ text: extractedText });

  } catch (error) {
    // 서비스 계층에서 발생한 에러를 중앙 에러 핸들러로 전달
    // 서비스 에러는 이미 status와 message를 포함하고 있을 수 있음
    console.error(`Controller Error in extractText: ${error.message}`);
    // next(error)를 호출하여 Express의 중앙 에러 처리 미들웨어가 처리하도록 함
    next(error); 
  }
};

module.exports = {
  extractText,
};