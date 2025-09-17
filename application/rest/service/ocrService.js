// application/rest/service/ocrService.js
const vision = require('@google-cloud/vision');
const path = require('path');

// node-fetch polyfills (만약 환경에 따라 필요하다면 유지, 보통 최신 Node.js에서는 불필요할 수 있음)
if (typeof Headers === 'undefined') {
    global.Headers = require('node-fetch').Headers;
}
if (typeof fetch === 'undefined') {
    global.fetch = require('node-fetch');
}

// Vision API 클라이언트 인스턴스 생성 및 초기화
// gcp-credentials.json 파일의 위치를 기준으로 경로 설정 (service 폴더 기준)
const keyFilePath = path.join(__dirname, '..', 'gcp-credentials.json'); // controller와 같은 위치에 있었으므로 경로 수정

let client;
try {
  client = new vision.ImageAnnotatorClient({
    keyFilename: keyFilePath,
  });
  console.log("Vision API 클라이언트가 성공적으로 초기화되었습니다 (ocrService). 키 파일:", keyFilePath);
} catch (error) {
  console.error("Vision API 클라이언트 초기화 실패 (ocrService). 서비스 계정 키 파일 경로를 확인하세요:", keyFilePath, error);
  // 클라이언트 초기화 실패 시 서비스 사용 불가 상태를 알릴 수 있음
}

/**
 * 이미지 버퍼에서 텍스트를 추출하는 서비스 함수
 * @param {Buffer} imageBuffer - 텍스트를 추출할 이미지의 버퍼
 * @returns {Promise<string>} 추출된 텍스트
 * @throws {Error} OCR 처리 중 오류 발생 시
 */
async function extractTextFromImageService(imageBuffer) {
  if (!client) {
    // 이 에러는 보통 서버 시작 시점에 감지되어야 함
    throw Object.assign(new Error("OCR 서비스가 초기화되지 않았습니다. 서버 설정을 확인하세요."), { status: 503 }); // Service Unavailable
  }
  if (!imageBuffer || imageBuffer.length === 0) {
    // 이 검사는 컨트롤러에서 이미 수행되었을 수 있지만, 서비스 레벨에서도 방어적으로 확인 가능
    throw Object.assign(new Error("이미지 데이터가 없습니다."), { status: 400 });
  }

  try {
    const imageContent = imageBuffer.toString('base64');

    const [result] = await client.documentTextDetection({
        image: { content: imageContent },
    });

    const fullTextAnnotation = result.fullTextAnnotation;
    let extractedText = "";

    if (fullTextAnnotation && fullTextAnnotation.text) {
      extractedText = fullTextAnnotation.text;
      console.log("Vision API에서 텍스트 추출 성공 (ocrService):", extractedText.substring(0, 100) + "...");
    } else {
      console.log("Vision API에서 텍스트를 감지하지 못했습니다 (ocrService).");
    }
    return extractedText;

  } catch (error) {
    console.error("Google Cloud Vision API 처리 중 오류 발생 (ocrService):", error);
    // 서비스 레벨 에러는 좀 더 구체적인 정보를 포함하거나, 일반적인 서버 에러로 throw
    const serviceError = new Error("OCR 처리 중 내부 오류가 발생했습니다.");
    serviceError.status = 500; // 내부 서버 오류
    serviceError.cause = error; // 원인 에러 첨부
    throw serviceError;
  }
}

module.exports = {
  extractTextFromImageService,
};