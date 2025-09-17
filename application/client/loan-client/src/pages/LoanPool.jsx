import React, { useState, useEffect } from "react";
import { v4 as uuidv4 } from 'uuid';
import { createPool, queryAllPools, getCurrentUser, getUserProfile ,joinPool ,getWalletBalance} from '../services/api';

const LoanPool = () => {
  const [poolName, setPoolName] = useState('');
  const [minDeposit, setMinDeposit] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [duration, setDuration] = useState('3');
  const [pools, setPools] = useState([]);
  const [userPools, setUserPools] = useState([]);
  const [initialDeposit, setInitialDeposit] = useState('');
  const [joinAmount, setJoinAmount] = useState('');
  const [selectedPoolId, setSelectedPoolId] = useState(null);
  const [poolSort, setPoolSort] = useState('최신순');
  const [poolStatusFilter, setPoolStatusFilter] = useState('전체 상태');
  const [userPoolSort, setUserPoolSort] = useState('최신순');
  const [userPoolStatusFilter, setUserPoolStatusFilter] = useState('전체 상태');
  const [userWalletAddress, setUserWalletAddress] = useState('');

  // 중복 클릭 방지용 state
  const [isCreating, setIsCreating] = useState(false);
  // joiningPoolId === 'A 풀 id' 이면, A 풀 버튼만 비활성화
  const [joiningPoolId, setJoiningPoolId] = useState(null);

  const handleCreatePool = async () => {
    if (isCreating) return; // 이미 요청 중이면 무시
    setIsCreating(true);
    
    const id = uuidv4();
    try {
      const user = await getCurrentUser();
      const profile = await getUserProfile(user.id);
      
      if (!profile.wallet_id) {
        throw new Error('지갑 주소를 찾을 수 없습니다.');
      }

      const poolData = {
        id,
        name: poolName,
        minDeposit: parseInt(minDeposit),
        interestRate: parseFloat(interestRate),
        durationMonths: parseInt(duration),
        creatorAddress: profile.wallet_id,
        initialDeposit: parseInt(initialDeposit)
      };

      console.log('풀 생성 시작:', poolData);

      // 입력값 검증
      if (!poolData.name || !poolData.minDeposit || !poolData.interestRate || !poolData.initialDeposit) {
        throw new Error('모든 필드를 입력해주세요.');
      }

      if (poolData.interestRate > 5) {
        throw new Error('이자율은 5%를 초과할 수 없습니다.');
      }

      if (poolData.initialDeposit < poolData.minDeposit) {
        throw new Error('초기 예치금은 최소 예치금보다 커야 합니다.');
      }

      await createPool(poolData);
      console.log('풀 생성 완료, 목록 갱신 시작');
      
      alert('✅ 풀 생성 및 예치 완료');
      
      // 입력 필드 초기화
      setPoolName('');
      setMinDeposit('');
      setInterestRate('');
      setDuration('3');
      setInitialDeposit('');
      
      // 풀 목록 즉시 갱신
      console.log('전체 풀 목록 갱신 시작');
      await fetchPools();
      
      // 사용자 풀 목록 갱신 (약간의 지연 후)
      console.log('사용자 풀 목록 갱신 시작');
      setTimeout(async () => {
        try {
          await fetchUserPools();
          console.log('사용자 풀 목록 갱신 완료');
        } catch (err) {
          console.error('사용자 풀 목록 갱신 실패:', err);
        }
      }, 2000);
    } catch (err) {
      console.error('풀 생성 실패:', err);
      const errorMessage = err.response?.data?.error || err.message;
      alert('❌ ' + errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const fetchPools = async () => {
    try {
      const data = await queryAllPools();
      setPools(data);
    } catch (err) {
      console.error('풀 목록 불러오기 실패:', err);
    }
  };

  const fetchUserPools = async () => {
    try {
      if (!userWalletAddress) {
        console.log('지갑 주소가 없어서 사용자 풀을 조회할 수 없습니다.');
        return;
      }
      console.log('사용자 풀 조회 시작, 지갑 주소:', userWalletAddress);
      
      const response = await fetch(`/QueryPoolsByUser?wallet=${userWalletAddress}`);
      console.log('API 응답 상태:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API 에러 응답:', errorData);
        throw new Error(errorData.error || '사용자 풀 조회 실패');
      }

      const data = await response.json();
      console.log('조회된 사용자 풀:', data);

      // 데이터가 null이나 undefined인 경우 빈 배열로 처리
      if (!data) {
        console.log('조회된 데이터가 없음');
        setUserPools([]);
        return;
      }

      // 데이터가 배열이 아닌 경우 배열로 변환
      const poolsArray = Array.isArray(data) ? data : [data];
      console.log('변환된 풀 배열:', poolsArray);

      const processedPools = poolsArray.map(pool => {
        if (!pool) {
          console.log('null 또는 undefined 풀 데이터 발견');
          return null;
        }
        
        const processedPool = {
          ...pool,
          id: pool.id || pool.ID,
          participants: Array.isArray(pool.participants) ? pool.participants : [],
          deposits: typeof pool.deposits === 'object' && pool.deposits !== null ? pool.deposits : {},
          joinedAt: typeof pool.joinedAt === 'object' && pool.joinedAt !== null ? pool.joinedAt : {},
          status: pool.status || 'Open',
          creator_address: pool.creator_address || pool.creatorAddress || userWalletAddress
        };
        console.log('처리된 풀:', processedPool);
        return processedPool;
      }).filter(Boolean); // null 값 제거

      console.log('최종 처리된 사용자 풀:', processedPools);
      setUserPools(processedPools);
    } catch (err) {
      console.error('참여 풀 목록 불러오기 실패:', err);
      console.error('에러 상세:', err.stack);
      setUserPools([]); // 에러 발생 시 빈 배열로 설정
    }
  };

  const loadWalletAddress = async () => {
    try {
      const user = await getCurrentUser();
      const profile = await getUserProfile(user.id);
      console.log('지갑 주소 로드:', profile.wallet_id);
      setUserWalletAddress(profile.wallet_id);
    } catch (err) {
      console.error('지갑 주소 가져오기 실패:', err);
    }
  };

  useEffect(() => {
    loadWalletAddress();
  }, []);

  useEffect(() => {
    if (userWalletAddress) {
      fetchPools();
      fetchUserPools();
    }
  }, [userWalletAddress]);

  const hasJoinedPool = (poolId) => {
    if (!Array.isArray(userPools)) {
      console.log('userPools가 배열이 아님:', userPools);
      return false;
    }

    console.log('참여 상태 체크 시작:', {
      poolId,
      userWalletAddress,
      userPools
    });

    const result = userPools.some(pool => {
      const poolIdToCheck = pool.id || pool.ID;
      const isIdMatch = poolIdToCheck === poolId;
      const isParticipant = Array.isArray(pool.participants) && 
                           pool.participants.includes(userWalletAddress);
      const hasDeposit = pool.deposits && pool.deposits[userWalletAddress];
      const isCreator = pool.creator_address === userWalletAddress || 
                       pool.creatorAddress === userWalletAddress;
      
      console.log('개별 풀 체크:', {
        poolId,
        poolIdToCheck,
        isIdMatch,
        isParticipant,
        hasDeposit,
        isCreator,
        participants: pool.participants,
        deposits: pool.deposits,
        creator_address: pool.creator_address,
        creatorAddress: pool.creatorAddress
      });
      
      return isIdMatch || isParticipant || hasDeposit || isCreator;
    });

    console.log('최종 참여 상태:', { poolId, result });
    return result;
  };

  const handleJoinPool = async () => {
    if (!joinAmount || !selectedPoolId) return;
    // 이미 다른 풀에 참여 요청 중이면 무시
    if (joiningPoolId) return;

    setJoiningPoolId(selectedPoolId);    
    try {
      const user = await getCurrentUser();
      const profile = await getUserProfile(user.id);
      await joinPool({
        poolID: selectedPoolId,
        userAddress: profile.wallet_id,
        deposit: parseInt(joinAmount),
        userId: user.id
      });
      alert('✅ 참여 완료');
      setJoinAmount('');
      setSelectedPoolId(null);
      
      await fetchUserPools();
      await fetchPools();
    } catch (err) {
      console.error('풀 참여 실패:', err);
      alert('❌ 참여 실패: ' + (err.response?.data?.error || err.message));
    } finally {
      setJoiningPoolId(null);
    }
  };

  const applyFilters = (list, sortKey, statusKey) => {
    let filtered = [...list];
    if (statusKey !== '전체 상태') {
      filtered = filtered.filter(pool => pool.status === (statusKey === '모집중' ? 'Open' : 'Closed'));
    }
    if (sortKey === '최신순') {
      filtered.sort((a, b) => new Date(b.endTime || b.end_time) - new Date(a.endTime || a.end_time));
    } else if (sortKey === '이자율순') {
      filtered.sort((a, b) => (b.interestRate || b.interest_rate) - (a.interestRate || a.interest_rate));
    }
    return filtered;
  };

  const renderPoolCard = (pool) => {
    const isJoined = hasJoinedPool(pool.id);
    const isOpen = pool.status === 'Open' || pool.status === 'open';
    const isJoiningThis = joiningPoolId === pool.id;

    // 여기서 “참여 인원 수”를 계산
    // participants 배열이 있으면 크기, 아니면 deposits 객체 키 개수
    const participantCount = Array.isArray(pool.participants)
      ? pool.participants.length
      : Object.keys(pool.deposits || {}).length;
      
    console.log('풀 카드 렌더링:', {
      poolId: pool.id,
      isJoined,
      isOpen,
      status: pool.status,
      participants: pool.participants,
      deposits: pool.deposits,
      userWalletAddress
    });
    
    return (
      <div key={pool.id} className="p-4 bg-white border rounded-lg shadow-sm">
        <div className="flex justify-between mb-2 text-sm font-medium">
          <span>{pool.name}</span>
          <span className={isOpen ? 'text-blue-600' : 'text-gray-400'}>
            {isOpen ? '모집중' : '모집완료'}
          </span>
        </div>
        {/* 참여 인원 표시 */}
        <p className="mb-1 text-sm">
          참여 인원: <strong>{participantCount}명</strong>
        </p>
        
        <p className="text-sm">총 모집액 <strong>{(pool.totalDeposit || pool.total_deposit)?.toLocaleString()} KRW</strong></p>
        <p className="text-sm">이자율 <strong>{(pool.interestRate || pool.interest_rate)}%</strong></p>
        <p className="mb-4 text-sm">마감일 <strong>{new Date(pool.endTime || pool.end_time).toLocaleDateString()}</strong></p>
        <button
          onClick={() => setSelectedPoolId(pool.id)}
          className={`w-full py-2 rounded-md text-sm ${
            !isOpen || isJoined || isJoiningThis
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          disabled={!isOpen || isJoined || isJoiningThis}
        >
          {!isOpen
            ? '모집 완료'
            : isJoined
            ? '참여중'
            : isJoiningThis
            ? '참여 중...'
            : '참여하기'}
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="flex justify-end gap-2 mb-6">
        <button className="flex items-center px-3 py-1.5 bg-white border text-sm text-blue-600 border-blue-600 rounded-md">
          <span className="w-2 h-2 mr-2 bg-blue-600 rounded-full"></span>
          지갑 연결됨
        </button>
              </div>

      {/* 새 풀 생성 폼 */}
      <div className="p-6 mb-8 bg-white rounded-lg shadow-md">
        <h2 className="mb-4 text-lg font-semibold">새 대출풀 만들기</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-sm">풀 이름</label>
            <input value={poolName} onChange={(e) => setPoolName(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="풀 이름을 입력하세요" />
          </div>
          <div>
            <label className="block mb-1 text-sm">참여자 최소 예치금</label>
            <input value={minDeposit} onChange={(e) => setMinDeposit(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="KRW" />
          </div>
          <div>
            <label className="block mb-1 text-sm">이자율</label>
            <input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="최대 5%" />
          </div>
          <div>
            <label className="block mb-1 text-sm">풀 모집 기간</label>
            <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full p-2 text-sm border rounded-md">
              <option value="3">3개월</option>
              <option value="6">6개월</option>
              <option value="12">12개월</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 text-sm">초기 예치금</label>
            <input value={initialDeposit} onChange={(e) => setInitialDeposit(e.target.value)} className="w-full p-2 text-sm border rounded-md" placeholder="KRW" />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">        
          <button
            onClick={handleCreatePool}
            className={`
              px-4 py-2 text-sm text-white rounded-md
              ${isCreating 
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed disabledButton' 
                : 'bg-blue-600 hover:bg-blue-700'}
            `}
            disabled={isCreating}
          >
            {isCreating ? '생성 중...' : '풀 생성하기'}
          </button>
          </div>
      </div>
      
      {/* 활성 대출풀 리스트 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-md">활성 대출풀</h3>
        <div className="flex gap-2">
          <select value={poolSort} onChange={(e) => setPoolSort(e.target.value)} className="p-2 text-sm border rounded-md">
            <option>최신순</option>
            <option>이자율순</option>
          </select>
          <select value={poolStatusFilter} onChange={(e) => setPoolStatusFilter(e.target.value)} className="p-2 text-sm border rounded-md">
            <option>전체 상태</option>
            <option>모집중</option>
            <option>모집완료</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {applyFilters(pools, poolSort, poolStatusFilter).map(renderPoolCard)}
      </div>
      
      {/* 내가 참여한 대출풀 리스트 */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-md">내가 참여한 대출풀</h3>
          <div className="flex gap-2">
            <select value={userPoolSort} onChange={(e) => setUserPoolSort(e.target.value)} className="p-2 text-sm border rounded-md">
              <option>최신순</option>
              <option>이자율순</option>
            </select>
            <select value={userPoolStatusFilter} onChange={(e) => setUserPoolStatusFilter(e.target.value)} className="p-2 text-sm border rounded-md">
              <option>전체 상태</option>
              <option>모집중</option>
              <option>모집완료</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {applyFilters(userPools, userPoolSort, userPoolStatusFilter).map(renderPoolCard)}
        </div>
      </div>
      
      {/* 참여 모달 */}
      {selectedPoolId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="p-6 bg-white rounded-lg shadow-md w-80">
            <h3 className="mb-4 font-semibold text-md">초기 예치금 입력</h3>
            <input
              type="number"
              className="w-full p-2 mb-4 border rounded-md"
              value={joinAmount}
              onChange={(e) => setJoinAmount(e.target.value)}
              placeholder="예치할 금액 (KRW)"
            />
            <div className="flex justify-end gap-2">
             <button
                onClick={() => {
                  if (joiningPoolId !== selectedPoolId) {
                    setSelectedPoolId(null);
                    setJoinAmount('');
                  }
                }}
                className="px-4 py-2 text-sm border rounded-md"
              >
                취소
              </button>
              {/* “참여” 버튼: 
                  - 모달이 떠 있는 풀에 참여 요청 중(joiningPoolId === selectedPoolId)일 때 비활성화 */}
              <button
                onClick={handleJoinPool}
                className={`px-4 py-2 text-sm text-white rounded-md ${
                  joiningPoolId === selectedPoolId
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
                disabled={joiningPoolId === selectedPoolId}
              >
                {joiningPoolId === selectedPoolId ? '참여 중...' : '참여'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanPool; 