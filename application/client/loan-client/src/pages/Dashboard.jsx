import React, {useState, useEffect, useMemo} from 'react';
import {
    getUserWalletAddress ,
    getWalletBalance,
    approveLoan,
    denyLoan,
    queryMyLoans,
    repayLoan,
    fetchAcceptedFriendsWithWallets,
    getUserProfile
} from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom'; 
import { HandHeart } from 'lucide-react';
import { motion } from "framer-motion";
import Footer from "../components/Footer";
import LoanAgreement from './contract/LoanAgreement';

// 금액을 한글 단위로 변환하는 유틸리티 함수
const formatAmount = (amount) => {
    if (amount >= 100000000) {
        return `${Math.floor(amount / 100000000)}억원`;
    } else if (amount >= 10000) {
        return `${Math.floor(amount / 10000)}만원`;
    } else if (amount >= 1000) {
        return `${Math.floor(amount / 1000)}천원`;
    }
    return `${amount.toLocaleString()}원`;
};

const Dashboard = () => {
    const [isRequesting, setIsRequesting] = useState(false);
    const [walletAddress, setWalletAddress] = useState('');
    const [balance, setBalance] = useState(0);
    const [loans, setLoans] = useState([]);
    const [isLoadingLoans, setIsLoadingLoans] = useState(true);
    const [friendWallets, setFriendWallets] = useState([]); // 친구 프로필 배열 

    const [loadingWallet, setLoadingWallet] = useState(true);

    const [creditScore, setCreditScore] = useState(null);  // 신용점수
    const [prevScore, setPrevScore] = useState(0);           // 한 달 전 점수

    const {user} = useAuth();
    const navigate = useNavigate();

    // 모달 상태
    const [showContractModal, setShowContractModal] = useState(false);
    const [modalLoanData, setModalLoanData] = useState(null);
    const [modalLenderProfile, setModalLenderProfile] = useState(null);
    const [modalBorrowerProfile, setModalBorrowerProfile] = useState(null);

    const [myProfile, setMyProfile] = useState(null);

    const fetchBalance = async () => {
        if (!user?.id) return;
        try {
            const wallet = await getUserWalletAddress(user.id);
            const balance = await getWalletBalance(wallet);
            
            setWalletAddress(wallet);
            setBalance(balance);
        } catch (error) {
            console.error('잔액 갱신 실패:', error.message);
        }finally {
            setLoadingWallet(false); 
        }
    };

    // 로그인한 사용자 잔액 가져오기
    useEffect(() => {
        fetchBalance();
    }, [user?.id]);

    // 내 대출 목록만 가져오기
    const loadMyLoans = async () => {
        setIsLoadingLoans(true);
        try {
            const result = await queryMyLoans(walletAddress);
            setLoans(
                Array.isArray(result)
                    ? result
                    : []
            );
        } catch (error) {
            console.error('내 대출 조회 실패:', error);
            alert('내 대출 조회 실패: ' + (
                error.response
                    ?.data
                        ?.error || error.message
            ));
            setLoans([]);
        }finally {
            setIsLoadingLoans(false); 
        }
    };

    useEffect(() => {
        if (walletAddress) 
            loadMyLoans();
        }
    , [walletAddress]);

    // 유저 프로필에서 신용점수 가져오기
    useEffect(() => {
        const fetchProfile = async () => {
            if (!user?.id) return;
            try {
                const profile = await getUserProfile(user.id);
                setMyProfile(profile);

                setCreditScore(profile.credit_score ?? 0);
                setPrevScore(profile.prev_credit_score ?? 0);

            } catch (err) {
                console.error('프로필 조회 실패:', err.message);
            }
        };
        fetchProfile();
    }, [user?.id]);
    // ** 지난 기간 대비 변화량 계산 **
    const { delta, label } = useMemo(() => {
        const diff = creditScore - prevScore;
        let sign = '';
        if (diff > 0) sign = '▲';
        else if (diff < 0) sign = '▼';
        const txt = diff !== 0 ? `${sign}${Math.abs(diff)}점` : '-';
        return { delta: diff, label: txt };
    }, [creditScore, prevScore]);

    // 3) "내가 빌린(= borrower) 대출들" 필터링
    const borrowedLoans = useMemo(() => {
        if (!walletAddress || !Array.isArray(loans)) return [];
        return loans.filter(loan => loan.borrower === walletAddress);
    }, [walletAddress, loans]);

    // 4) "지난 12개월" 기간에 해당하는 대출 중에서,
    // - 총 "내가 빌린" 대출 건수
    // - 그 중 'Repaid' 상태인 건수
    // 로 상환율을 계산합니다.
    const repaymentRateInfo = useMemo(() => {
        if (!borrowedLoans.length) {
        return { rate: 0, countTotal: 0, countRepaid: 0 };
        }

        // 현재 시간 기준으로 12개월 전(365일 전) 타임스탬프 구하기
        const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
        const nowMs = Date.now();
        const oneYearAgoMs = nowMs - ONE_YEAR_MS;

        // 'startTime' 혹은 'created_at' 등, 언제 빌린 대출인지 확인 가능한 필드가 필요합니다.
        // 여기서는 체인코드에서 채워주는 'startTime'(초 단위 UNIX) 을 사용한다고 가정:
        // => 자바스크립트 millisecond 단위로 비교하려면 startTime * 1000 해야 합니다.

        let countTotal = 0;
        let countRepaid = 0;

        borrowedLoans.forEach(loan => {
        // 1) "내가 빌린" 대출이 "지난 12개월" 이내에 시작된 것인지 확인
        //    (loan.startTime: 초 단위 UNIX)
        const loanStartMs = Number(loan.startTime) * 1000;
        if (loanStartMs >= oneYearAgoMs) {
            countTotal += 1;
            // 2) status가 'Repaid'인 경우만 countRepaid 증가
            if (loan.status.toLowerCase() === 'repaid') {
            countRepaid += 1;
            }
        }
        });

        const rate = countTotal > 0
        ? Math.round((countRepaid / countTotal) * 100)
        : 0;

        return { rate, countTotal, countRepaid };
    }, [borrowedLoans]);

    // useMemo: wallet_id → profile 객체 매핑
    const profileMap = useMemo(() => {
        return friendWallets.reduce((acc, profile) => {
            acc[profile.wallet_id] = profile;
            return acc;
        }, {});
    }, [friendWallets]);

    // 친구 목록 불러오는 useEffect
    useEffect(() => {
        const loadFriendProfiles = async () => {
            if (!user?.id) return;
            try {
                const friendsWithWallets = await fetchAcceptedFriendsWithWallets(user.id);
                setFriendWallets(friendsWithWallets);
            } catch (err) {
                console.error('🔍 친구 프로필 조회 실패:', err.message);
            }
        };

        loadFriendProfiles();
    }, [user?.id]);

    // 대출 승인
    const handleApproveLoan = async (loanId) => {
        try {
            await approveLoan(loanId);
            alert('대출이 승인되었습니다!');
            // 체인에서 상태가 Active로 확정될 시간을 약간 더 기다리기 (여유 분 1~2초 정도)
            await new Promise(resolve => setTimeout(resolve, 1500));
            await loadMyLoans();
            fetchBalance();
        } catch (error) {
            console.error('대출 승인 실패:', error);
            alert('대출 승인 실패: ' + (
                error.response
                    ?.data
                        ?.message || error.message
            ));
        }
    };

    // 대출 거절
    const handleDenyLoan = async (loanId) => {
        try {
            await denyLoan(loanId);
            alert('대출이 거절되었습니다!');
            await loadMyLoans();
        } catch (error) {
            console.error('대출 거절 실패:', error);
            alert('대출 거절 실패: ' + (
                error.response
                    ?.data
                        ?.message || error.message
            ));
        }
    };

    const handleRepayLoan = async (loanId) => {
        if (isRequesting) return;

        setIsRequesting(true);
        
        try {
            const confirm = window.confirm("정말 상환하시겠습니까?");
            if (!confirm) return;

            await repayLoan(loanId); // 서버에서 체인코드의 RepayLoan 호출
            alert('상환이 완료되었습니다.');
            await loadMyLoans(); 
        } catch (error) {
            console.error('상환 오류:', error);
            alert('상환 중 오류가 발생했습니다.');
        }finally {
            setIsRequesting(false);
            await fetchBalance(); // 상환 후 잔액 다시 조회

        }
    };


    // ─────────── 여기서 “계약서 보기” 버튼 클릭 시 호출 ───────────
   const openContractModal = (loan) => {
    // 1. 현재 로그인 사용자가 채권자인지 확인
    const isLender = loan.lender === walletAddress;

    // 2. 채권자·채무자 프로필 설정
    //    - 만약 모달을 여는 사람이 채권자(isLender===true)라면,
    //      lenderProfile = 내 프로필(myProfile), borrowerProfile = 친구 프로필
    //    - 모달을 여는 사람이 차입자(isLender===false)라면,
    //      lenderProfile = 친구 프로필, borrowerProfile = 내 프로필(myProfile)
    const lenderProfile = isLender
      ? {  
          // 내 프로필 객체: getUserProfile 결과를 profileMap에 미리 저장해 둔 경우라면
          // profileMap[loan.lender]을 써도 되고, myProfile을 따로 가져오셨다면 그것을 사용해도 됩니다.
          // 예를 들어 myProfile 상태에 프로필 전체가 들어 있다면:
          id: myProfile.id,
          name: myProfile.name,
          birth_number: myProfile.birth_number,
          phone: myProfile.phone,
          address: myProfile.address,
          wallet_id: myProfile.wallet_id
        }
      : profileMap[loan.lender] || { 
          // 만약 친구 프로필이 profileMap에 없으면,
          name: loan.lender,
          birth_number: "",
          phone: "",
          address: "",
          wallet_id: loan.lender
        };

    const borrowerProfile = isLender
      ? (profileMap[loan.borrower] || {
          name: loan.borrower,
          birth_number: "",
          phone: "",
          address: "",
          wallet_id: loan.borrower
        })
      : {  
          id: myProfile.id,
          name: myProfile.name,
          birth_number: myProfile.birth_number,
          phone: myProfile.phone,
          address: myProfile.address,
          wallet_id: myProfile.wallet_id
        };

    // 3. 계약서 날짜·금액 계산 (기존 로직 그대로)
    const startMs = Number(loan.startTime) * 1000;
    const endMs = startMs + Number(loan.durationDays) * 24 * 60 * 60 * 1000;
    const startDate = new Date(startMs).toLocaleDateString("ko-KR");
    const endDate = new Date(endMs).toLocaleDateString("ko-KR");

    const totalRepayment =
      loan.totalRepayment ??
      (Number(loan.amount) +
        (Number(loan.interestRate) *
          Number(loan.amount) *
          (Number(loan.durationDays) / 365)) /
          100);

    // 4. modalLoanData에 “항상 lenderProfile이 ‘채권자’, borrowerProfile이 ‘채무자’”로 되도록 저장
    setModalLoanData({
      id: loan.id,
      lender: loan.lender,
      borrower: loan.borrower,
      amount: loan.amount,
      interestRate: loan.interestRate,
      durationMonths: loan.durationDays / 30,
      durationDays: loan.durationDays,
      bankAccount: loan.bankAccount || "신한은행 123-456-789012 (예금주: 홍길동)",
      message: loan.message || "",
      startDate,
      endDate,
      totalRepayment
    });

    // 5. 모달에서 사용할 양쪽 프로필을 상태로 저장
  setModalLenderProfile(lenderProfile);
  setModalBorrowerProfile(borrowerProfile);


    // 6. 모달 열기
    setShowContractModal(true);
  };
    
    return (
        <div className="bg-white text-gray-800 p-4 sm:p-8 md:p-12 lg:p-20 text-[15px] sm:text-[17px]">
            {/* 상단 카드 */}
            <div className="grid grid-cols-1 gap-4 mb-10 sm:grid-cols-2 lg:grid-cols-4">
                {/* 신용 점수 카드 */}
                <div className="p-4 bg-white border shadow-sm sm:p-6 rounded-xl">
                    <p className="mb-1 text-sm text-gray-500">신용 점수</p>
                    <div className="flex items-baseline">
                        <p className="text-2xl font-bold sm:text-3xl whitespace-nowrap">
                            {creditScore}
                        </p>
                        <span className={`ml-2 text-sm ${delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-gray-400'} sm:text-base`}>
                            {label}
                        </span>
                    </div>
                </div>

                {/* 활성 대출 카드 */}
                <div className="p-4 bg-white border shadow-sm sm:p-6 rounded-xl">
                    <p className="mb-1 text-sm text-gray-500">활성 대출</p>
                    <p className="mb-1 text-2xl font-bold sm:text-3xl">
                        {loans.filter(loan => loan.status === 'Active').length}
                    </p>
                    <p className="text-sm text-gray-600 truncate sm:text-base">
                        총 {formatAmount(loans.filter(loan => loan.status === 'Active')
                            .reduce((sum, loan) => sum + loan.amount, 0))}
                    </p>
                </div>

                {/* 대출 상환율 카드 */}
                <div className="p-4 bg-white border shadow-sm sm:p-6 rounded-xl">
                    <p className="mb-1 text-sm text-gray-500">대출 상환율</p>
                    <p className="mb-1 text-2xl font-bold sm:text-3xl">{repaymentRateInfo.rate}%</p>                    <p className="text-xs text-gray-400">지난 12개월</p>
                </div>

                {/* 잔액 카드 */}
                <div className="p-4 bg-white border shadow-sm sm:p-6 rounded-xl">
                    <p className="mb-1 text-sm text-gray-500">잔액</p>
                    <div className="flex flex-col">
                        <p className="mb-1 text-2xl font-bold sm:text-3xl">
                            {formatAmount(balance)}
                        </p>
                        <p className="text-xs text-gray-400">
                            {balance.toLocaleString()} KRW
                        </p>
                    </div>
                </div>
            </div>

            {/* 대출 요청 섹션 */}
            <div className="relative flex items-center justify-between bg-gradient-to-r from-blue-500 to-purple-400 text-white rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 min-h-[180px] sm:min-h-[220px] mb-10 overflow-hidden">
                {/* 왼쪽 콘텐츠 */}
                <div className="z-10 max-w-md space-y-2 sm:space-y-3">
                    {/* 아이콘 + 제목 */}
                    <div className="flex items-center mb-2 space-x-2 sm:space-x-3 sm:mb-3">
                        <div className="bg-white p-1.5 sm:p-2 rounded-xl flex items-center justify-center shadow-md w-10 h-10 sm:w-12 sm:h-12">
                            <img src={'/dashboard_1.png'} alt="친구에게 대출 요청 아이콘" className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <h1 className="text-lg font-semibold sm:text-xl">친구에게 대출 요청</h1>
                    </div>

                    {/* 설명 텍스트 */}
                    <p className="text-sm leading-relaxed sm:text-base opacity-90">
                        <span className="font-semibold">쉽고 빠르게</span> 친구에게 대출을 요청하세요.<br />
                        요청이 승인되면 즉시 대출이 진행됩니다.
                    </p>

                    {/* 버튼 */}
                    <button
                        onClick={() => navigate('/dashboard/request')}
                        className="inline-flex items-center px-6 py-2 mt-4 mb-4 font-semibold text-blue-700 transition transform bg-white shadow-lg sm:mt-6 sm:px-8 sm:py-3 rounded-xl hover:bg-gray-100 hover:scale-105 sm:mb-6"
                    >
                        <img src={'/dashboard_2.png'} alt="대출 요청 아이콘" className="w-4 h-4 mr-2 sm:w-5 sm:h-5" />
                        친구 대출 요청하기
                    </button>
                </div>

                {/* 오른쪽 큰 아이콘 */}
                <div className="absolute hidden text-white right-4 sm:right-6 bottom-4 sm:bottom-6 opacity-40 md:block">
                    <HandHeart size={60} className="sm:w-80 sm:h-80" />
                </div>
            </div>

            {/* 최근 활동 */}
            <div>
                <h2 className="mb-4 text-lg font-semibold sm:text-xl">최근 활동</h2>
                
                {isLoadingLoans ? (
                    <p className="text-gray-500">불러오는 중...</p>
                ) : (
                <div className="space-y-4">
                    {loans.map(loan => {
                        const isLender = loan.lender === walletAddress;
                        const otherId = isLender ? loan.borrower : loan.lender;
                        const other = profileMap[otherId] || {};
                        const otherName = other.name || other.email || otherId;
                        let text = '';
                        switch (loan.status) {
                            case 'Pending':
                                text = isLender
                                    ? `${otherName}님이 대출을 요청했습니다`
                                    : `${otherName}님에게 대출을 요청했습니다`;
                                break;
                            case 'Active':
                                text = isLender
                                    ? `${otherName}님의 대출을 승인했습니다`
                                    : `${otherName}님에게 대출을 받았습니다`;
                                break;
                            case 'Repaid':
                                text = isLender
                                    ? `${otherName}님이 상환했습니다`
                                    : `상환한 대출입니다`;
                                break;
                            case 'Denied':
                                text = isLender
                                    ? `${otherName}님의 요청 거절됨`
                                    : `내 요청 거절됨`;
                                break;
                            default:
                                text = '';
                        }

                        return (
                            <div key={loan.id} className="flex flex-col justify-between p-3 mb-2 border sm:flex-row sm:items-center sm:p-4 rounded-xl">
                                {/* 왼쪽: 텍스트 */}
                                <div className="flex flex-col mb-2 sm:mb-0">
                                    <p className="mb-1 text-sm sm:text-base">{text}</p>
                                    <p className="text-xs text-gray-500 sm:text-sm">
                                        {formatAmount(loan.amount)} • {loan.durationDays}일
                                    </p>
                                </div>

                                {/* 오른쪽: Pending 상태인 경우, 대출자가 로그인했으면 “계약서 보기” 버튼 */}
                                <div className="flex items-center space-x-2">
                                    {loan.status === 'Pending' && isLender && (
                                    <button
                                        onClick={() => openContractModal(loan)}
                                        className="px-3 py-1 text-xs text-blue-600 rounded-md bg-blue-50 sm:text-sm sm:px-4 hover:bg-blue-100"
                                    >
                                        계약서 보기
                                    </button>
                                    )}

                                    {loan.status === 'Active' && (
                                        <div className="flex items-center space-x-2">
                                            <span className="px-2 py-1 text-xs text-green-600 rounded-md sm:text-sm bg-green-50 sm:px-3">
                                            진행중
                                            </span>

                                            {/* 현재 로그인한 유저가 borrower일 때만 상환 버튼 표시 */}
                                            {loan.borrower === walletAddress && (
                                            <button
                                                onClick={() => handleRepayLoan(loan.id)}
                                                disabled={isRequesting}
                                                className={`px-2 py-1 text-xs text-white rounded-md sm:text-sm sm:px-3 ${isRequesting ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}
                                            >
                                                {isRequesting ? '상환 중...' : '상환하기'}
                                            </button>
                                            )}
                                        </div>
                                        
                                    )}
                                    {loan.status === 'Denied' && (
                                        <span className="px-2 py-1 text-xs text-red-500 rounded-md sm:text-sm bg-red-50 sm:px-3">
                                            거절됨
                                        </span>
                                    )}
                                    {loan.status === 'Repaid' && (
                                        <span className="flex items-center space-x-1 text-xs text-green-600 sm:text-sm">
                                            <span className="text-lg sm:text-xl">✔</span>
                                            <span>완료</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
                )}
            </div>

            {/* ─────────── LoanAgreement 모달 렌더링 ─────────── */}
            {showContractModal && modalLoanData && modalLenderProfile && modalBorrowerProfile && (
                    <LoanAgreement
                    loanData={modalLoanData}
                    // 여기에 반드시 “채권자 프로필”을 먼저, “채무자 프로필”을 두 번째 인자로 넘겨줍니다.
                    selectedFriend={modalLenderProfile}    // 채권자 정보
                    borrowerProfile={modalBorrowerProfile} // 채무자 정보
                    estimatedRepaymentDate={modalLoanData.endDate}
                    totalRepayment={modalLoanData.totalRepayment}
                    startDate={modalLoanData.startDate}
                    endDate={modalLoanData.endDate}
                    onClose={() => {
                        setShowContractModal(false);
                        setModalLoanData(null);
                        setModalLenderProfile(null);
                        setModalBorrowerProfile(null);
                    }}
                    onApprove={async () => {
                        // 체인코드 approve 호출
                        await approveLoan(modalLoanData.id);
                        alert("대출 요청을 승인했습니다.");
                        await loadMyLoans();
                        await fetchBalance();
                    }}
                    onReject={async () => {
                        await denyLoan(modalLoanData.id);
                        alert("대출 요청을 거절했습니다.");
                        await loadMyLoans();
                    }}
                    />
                )}
        </div>
    );

}

export default Dashboard;