// application/client-react/src/services/notaryService.js
import axios from 'axios';
// axios 기본 URL 설정 (이미 되어 있다면 그대로 사용)
axios.defaults.baseURL = "http://localhost:8001"; 
// axios 요청 시 쿠키를 주고받기 위한 설정 (세션 기반 인증 시 필요)
axios.defaults.withCredentials = true; 


/**
 * 현재 로그인된 공증인이 자신의 상세 홍보 정보를 생성하거나 업데이트합니다.
 * @param {object} detailsData - 공증인 상세 정보. 예:
 * {
 *   company_phone: string,
 *   consultation_phone: string,
 *   phone_consultation_fee: number | null,
 *   visit_consultation_fee: number | null,
 *   tags: Array<string>,
 *   description: string
 * }
 * @returns {Promise<object>} 성공 응답 데이터 (보통 메시지와 함께 업데이트된 데이터 일부 포함)
 */
const upsertOwnNotaryDetails = async (detailsData) => {
  try {
    // API 엔드포인트: PUT /api/notary/details
    // 백엔드 컨트롤러는 요청을 보낸 사용자(세션/토큰 기반)의 ID를 사용하여 처리합니다.
    const response = await axios.put('/api/notary/details', detailsData);
    return response.data; // 예: { message: "성공 메시지", data: { ... } }
  } catch (error) {
    console.error('Error in upsertOwnNotaryDetails:', error.response?.data || error.message);
    // 오류 응답이 있다면 해당 응답의 data를 throw하고, 없다면 일반 Error 객체를 throw
    throw error.response?.data || new Error(error.message || '공증인 정보 업데이트 중 오류가 발생했습니다.');
  }
};

/**
 * 현재 로그인된 공증인의 상세 정보를 가져옵니다.
 * 이 정보에는 NotaryDetails 테이블의 정보와 Users 테이블의 관련 정보(예: 회사명)가 포함될 수 있습니다.
 * @returns {Promise<object | null>} 공증인 상세 정보 객체. 
 *          정보가 아직 없거나 사용자를 찾을 수 없는 경우 null을 반환할 수 있음.
 *          성공 시 예시: { userCompanyName: "회사명", company_phone: "02-...", tags: [], ... }
 */
const getOwnNotaryDetails = async () => {
  try {
    // API 엔드포인트: GET /api/notary/my-details
    // 백엔드는 현재 요청을 보낸 사용자(세션/토큰 기반)를 식별하여 정보를 반환합니다.
    const response = await axios.get('/api/notary/my-details');
    return response.data; 
  } catch (error) {
    if (error.response && error.response.status === 404) {
      // 404는 "찾을 수 없음"을 의미하며, 공증인 정보가 아직 등록되지 않았을 수 있음
      console.warn('getOwnNotaryDetails: Notary details not found (404). This might be normal if not yet registered.');
      return null; 
    }
    console.error('Error in getOwnNotaryDetails:', error.response?.data || error.message);
    throw error.response?.data || new Error(error.message || '저장된 공증인 정보를 가져오는 중 오류가 발생했습니다.');
  }
};


export default {
  upsertOwnNotaryDetails,
  getOwnNotaryDetails, // 새로 추가된 함수
};