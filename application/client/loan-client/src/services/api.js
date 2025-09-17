import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const API_BASE_URL = 'http://localhost:8001';

// API 요청을 위한 axios 인스턴스 생성
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: 모든 요청에 Supabase JWT를 자동으로 추가합니다.
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// --- 지갑 관련 API ---

/**
 * Supabase에서 로그인 유저의 wallet_id를 조회합니다.
 * @param {string} userId - Supabase auth.users.id
 * @returns {Promise<string>} 사용자의 지갑 주소(wallet_id)
 */
export const getUserWalletAddress = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('wallet_id')
    .eq('id', userId)
    .single();

  if (error) throw new Error('지갑 주소 조회 실패: ' + error.message);
  if (!data?.wallet_id) throw new Error('지갑 주소가 등록되지 않았습니다.');
  return data.wallet_id;
};

/**
 * 사용자의 지갑을 생성합니다. (서버 경유 -> 체인코드 호출)
 * @param {string} userId - 지갑을 생성할 사용자의 UUID
 * @returns {Promise<object>} 서버 응답 객체
 */
export const createWallet = async (userId) => {
  try {
    const response = await api.post('/wallet/create', { userId });
    return response.data;
  } catch (error) {
    console.error('api.js Sending wallet create request', userId);
    throw error;
  }
};

/**
 * 특정 지갑 주소의 잔액을 조회합니다.
 * @param {string} address - 잔액을 조회할 지갑 주소
 * @returns {Promise<object>} 체인코드에서 반환된 잔액 정보
 */
export const getWalletBalance = async (address) => {
  try {
    const response = await api.get(`/getWalletBalance?address=${address}`);
    return response.data;
  } catch (error) {
    console.error('잔액 조회 실패:', error);
    throw error;
  }
};

// --- P2P 대출 관련 API ---

/**
 * 새로운 P2P 대출을 생성하고 계약서를 저장합니다.
 * @param {object} loanData - 대출 데이터 객체
 * @param {string} loanData.id - 대출 고유 ID
 * @param {string} loanData.lender - 채권자 지갑 주소
 * @param {string} loanData.borrower - 채무자 지갑 주소
 * @param {number} loanData.amount - 대출 원금
 * @param {number} loanData.durationDays - 대출 기간(일)
 * @param {number} loanData.interestRate - 이자율
 * @param {string} loanData.contractImage - Base64로 인코딩된 계약서 이미지
 * @returns {Promise<object>} 서버 응답 객체
 */
export const createLoan = async (loanData) => {
  try {
    if (!loanData.contractImage) {
      throw new Error('계약서 이미지가 필요합니다.');
    }

    const response = await api.post('/createLoan', {
      id: loanData.id,
      lender: loanData.lender,
      borrower: loanData.borrower,
      amount: loanData.amount,
      durationDays: loanData.durationDays,
      interestRate: loanData.interestRate
    });

    await downloadAndSaveContract(loanData.id, loanData.contractImage);

    return {
      ...response.data,
      message: '대출이 생성되었고 계약서가 다운로드되었습니다.'
    };
  } catch (error) {
    console.error('대출 생성 실패:', error);
    throw error;
  }
};

/**
 * P2P 대출을 승인합니다.
 * @param {string} loanId - 승인할 대출의 ID
 * @returns {Promise<object>} 서버 응답 객체
 */
export const approveLoan = async (loanId) => {
  try {
    const response = await api.get(`/approveLoan?id=${loanId}`);
    return response.data;
  } catch (error) {
    console.error('대출 승인 실패:', error);
    throw error;
  }
};

/**
 * P2P 대출을 거절합니다.
 * @param {string} loanId - 거절할 대출의 ID
 * @returns {Promise<object>} 서버 응답 객체
 */
export const denyLoan = async (loanId) => {
  try {
    const response = await api.get(`/denyLoan?id=${loanId}`);
    return response.data;
  } catch (error) {
    console.error('대출 거절 실패:', error);
    throw error;
  }
};

/**
 * P2P 대출금을 상환합니다.
 * @param {string} loanId - 상환할 대출의 ID
 * @returns {Promise<object>} 서버 응답 객체
 */
export const repayLoan = async (loanId) => {
  try {
    const response = await api.post('/loan/repay', { loanId }); 
    return response.data;
  } catch (error) {
    console.error('상환 요청 실패:', error);
    throw error;
  }
};

/**
 * 특정 P2P 대출 정보를 조회합니다.
 * @param {string} id - 조회할 대출의 ID
 * @returns {Promise<object>} 대출 상세 정보
 */
export const queryLoan = async (id) => {
    try {
        const response = await api.get(`/queryLoan?id=${id}`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

/**
 * 체인코드에 기록된 모든 P2P 대출 목록을 조회합니다.
 * @returns {Promise<Array<object>>} 전체 대출 목록
 */
export const queryAllLoans = async () => {
  try {
    const response = await api.get('/queryAllLoans');
    return response.data;
  } catch (error) {
    console.error('대출 조회 실패:', error);
    throw error;
  }
}; 

/**
 * 특정 지갑 주소와 관련된 모든 P2P 대출 목록을 조회합니다.
 * @param {string} walletAddress - 사용자의 지갑 주소
 * @returns {Promise<Array<object>>} 나의 대출 목록
 */
export const queryMyLoans = async (walletAddress) => {
  try {
    const response = await api.get(`/myLoans?wallet=${walletAddress}`);
    return response.data;
  } catch (error) {
    console.error('내 대출 목록 조회 실패:', error);
    throw error;
  }
};

// --- 대출 풀 관련 API ---

/**
 * 새로운 대출 풀을 생성합니다.
 * @param {object} poolData - 생성할 대출 풀의 데이터
 * @returns {Promise<object>} 서버 응답 객체
 */
export const createPool = async (poolData) => {
  try {
    const response = await api.post('/createPool', poolData);
    return response.data;
  } catch (error) {
    console.error('대출풀 생성 실패:', error);
    throw error;
  }
};

/**
 * 특정 대출 풀 정보를 조회합니다.
 * @param {string} id - 조회할 풀의 ID
 * @returns {Promise<object>} 풀 상세 정보
 */
export const queryPool = async (id) => {
  try {
    const response = await api.get(`/queryPool?id=${id}`);
    return response.data;
  } catch (error) {
    console.error('단일 풀 조회 실패:', error);
    throw error;
  }
};

/**
 * 모든 대출 풀 목록을 조회합니다.
 * @returns {Promise<Array<object>>} 전체 풀 목록
 */
export const queryAllPools = async () => {
  try {
    const response = await api.get('/queryAllPools');
    const fixedData = (Array.isArray(response.data) ? response.data : response.data.result).map(pool => ({
      ...pool,
      participants: Array.isArray(pool.participants) ? pool.participants : [],
      weights: typeof pool.weights === 'object' && pool.weights !== null ? pool.weights : {},
    }));
    return fixedData;
  } catch (error) {
    console.error('전체 풀 조회 실패:', error);
    throw error;
  }
};

/**
 * 대출 풀에 참여(자금 예치)합니다.
 * @param {object} data - 참여 정보
 * @param {string} data.poolID - 참여할 풀의 ID
 * @param {string} data.userAddress - 참여자 지갑 주소
 * @param {number} data.deposit - 예치할 금액
 * @returns {Promise<object>} 서버 응답 객체
 */
export const joinPool = async ({ poolID, userAddress, deposit }) => {
  try {
    const response = await api.post('/joinPool', { poolID, userAddress, deposit });
    return response.data;
  } catch (error) {
    console.error('풀 참여 실패:', error);
    throw error;
  }
};

// --- 사용자 및 프로필 API (Supabase 직접 호출) ---

/**
 * 현재 로그인된 유저의 Supabase auth 정보를 가져옵니다.
 * @returns {Promise<object>} Supabase 사용자 객체
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * 특정 사용자의 상세 프로필 정보를 Supabase에서 직접 가져옵니다.
 * @param {string} userId - 조회할 사용자의 UUID
 * @returns {Promise<object>} 사용자의 프로필 객체
 */
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

/**
 * 현재 사용자와 친구 관계이며 지갑이 있는 모든 친구 목록을 조회합니다.
 * @param {string} userId - 현재 사용자의 UUID
 * @returns {Promise<Array<object>>} 친구들의 프로필 객체 배열
 */
export const fetchAcceptedFriendsWithWallets = async (userId) => {
    if (!userId) return [];

    const { data: sent, error: sentError } = await supabase
        .from('friends')
        .select('friend_user_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

    const { data: received, error: receivedError } = await supabase
        .from('friends')
        .select('user_id')
        .eq('friend_user_id', userId)
        .eq('status', 'accepted');

    if (sentError || receivedError) {
        throw new Error('친구 목록 조회 실패');
    }

    const friendIds = [
        ...sent.map(f => f.friend_user_id),
        ...received.map(f => f.user_id),
    ];

    if (friendIds.length === 0) return [];

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

    if (profileError) {
        throw new Error('친구 프로필 조회 실패');
    }

    return profiles.filter(profile => profile.wallet_id);
};

// --- 친구 관계 API ---

/**
 * 다른 사용자에게 친구 추가를 요청합니다.
 * @param {string} userId - 요청을 보내는 사용자의 UUID
 * @param {string} friendEmail - 친구 요청을 받을 사용자의 이메일
 * @returns {Promise<object>} 서버 응답 객체
 */
export async function sendFriendRequest(userId, friendEmail) {
  try {
    const response = await api.post('/api/friends/add', {
      userId,
      friendEmail,
    });
    return response.data;
  } catch (error) {
   console.error('[app.js] sendFriendRequest 실패:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 현재 사용자의 친구 목록을 조회합니다.
 * @returns {Promise<Array<object>>} 친구 목록
 */
export async function getFriendList() {
  try {
    const response = await api.get('/api/friends');
    return response.data.friends || [];
  } catch (error) {
    console.error('[app.js] getFriendList 실패:', error);
    throw error;
  }
}

/**
 * 받은 친구 요청 목록을 조회합니다.
 * @returns {Promise<Array<object>>} 받은 친구 요청 목록
 */
export async function getReceivedRequests() {
  try {
    const response = await api.get('/api/friends/received');
    return response.data.requests || [];
  } catch (error) {
    console.error('[app.js] getReceivedRequests 실패:', error);
    throw error;
  }
}

/**
 * 친구 요청을 수락 또는 거절합니다.
 * @param {string} requestId - 처리할 친구 요청의 ID (friends 테이블의 PK)
 * @param {boolean} [accept=true] - 수락 여부 (기본값: true)
 * @returns {Promise<object>} 서버 응답 객체
 */
export async function handleFriendRequest(requestId, accept = true) {
  try {
    const response = await api.patch('/api/friends/request', {
      requestId,
      status: accept ? 'accepted' : 'rejected',
    });
    return response.data;
  } catch (error) {
    console.error('[app.js] handleFriendRequest 실패:', error);
    throw error;
  }
}

// --- 계약서 관련 API ---

/**
 * 계약서 이미지의 유효성을 검증합니다.
 * @param {string} loanId - 대출 ID
 * @param {string} contractImage - 검증할 계약서의 Base64 데이터
 * @returns {Promise<object>} 검증 결과 객체
 */
export const verifyContract = async (loanId, contractImage) => {
  try {
    const response = await api.get('/api/contract/verify', {
      params: { loanId },
      data: { contractImage }
    });
    return response.data;
  } catch (error) {
    console.error('계약서 검증 중 오류:', error);
    throw error;
  }
};

/**
 * 계약서 이미지의 해시를 서버에 저장합니다.
 * @param {string} loanId - 대출 ID
 * @param {string} contractImage - 해시를 생성할 계약서의 Base64 데이터
 * @returns {Promise<object>} 저장 결과 객체
 */
export const saveContract = async (loanId, contractImage) => {
  try {
    const response = await api.post('/api/contract/save', {
      loanId,
      contractImage
    });
    return response.data;
  } catch (error) {
    console.error('계약서 저장 중 오류:', error);
    throw error;
  }
};

/**
 * 계약서 해시를 서버에 저장하고, 사용자에게 파일을 다운로드해주는 필수 절차 함수입니다.
 * @param {string} loanId - 대출 ID
 * @param {string} contractImage - 계약서의 Base64 데이터
 * @returns {Promise<object>} 성공 여부 및 해시값
 */
export const downloadAndSaveContract = async (loanId, contractImage) => {
  try {
    if (!contractImage) {
      throw new Error('계약서 이미지가 필요합니다.');
    }

    const saveResult = await saveContract(loanId, contractImage);
    if (!saveResult.success) {
      throw new Error('계약서 해시 저장에 실패했습니다.');
    }

    function dataURLToBlob(dataUrl) {
      const [header, base64Data] = dataUrl.split(',');
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'image/png' });
    }

    const blob = dataURLToBlob(contractImage);

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `contract_${loanId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    return {
      success: true,
      contractHash: saveResult.contractHash,
      message: '계약서가 다운로드되었습니다.'
    };
  } catch (error) {
    console.error('계약서 다운로드 및 저장 실패:', error);
    throw error;
  }
};

// --- 기타 헬퍼 API ---

/**
 * 사용자의 모든 대출 관련 거래(송금, 수신) 기록을 조회합니다.
 * @param {string} userId - 조회할 사용자의 UUID
 * @returns {Promise<Array<object>>} 거래 기록 배열
 */
export const getMyLoanTransactions = async (userId) => {
  try {
    const response = await api.post('/myLoanTransactions', { userId });
    return response.data.data;
  } catch (error) {
    console.error('내 대출 거래 기록 조회 실패:', error);
    throw error;
  }
};

/**
 * 사용자 ID로 이름을 조회합니다.
 * @param {string} userId - 조회할 사용자의 UUID
 * @returns {Promise<string>} 사용자 이름
 */
export const getNameById = async (userId) => {
  try {
    const res = await api.post('/getName', { userId });
    return res.data;
  } catch (err) {
    console.error('[❌ getNameById 실패]', err.response?.data || err.message);
    throw err;
  }
};

/**
 * 대출 ID로 이자율과 기간을 조회합니다.
 * @param {string} loanId - 조회할 대출의 ID
 * @returns {Promise<object>} 이자율과 기간 정보 객체 { interest_rate, duration_days }
 */
export const getLoanMeta = async (loanId) => {
  try {
    const res = await api.post('/getLoanMeta', { loanId });
    return res.data;
  } catch (error) {
    console.error('[❌ getLoanMeta 실패]', error.response?.data || error.message);
    throw error;
  }
};
