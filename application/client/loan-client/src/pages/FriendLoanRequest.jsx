import { useState, useEffect } from "react";
import { ChevronLeft, Edit, Search } from "lucide-react";
import { CheckCircle } from "lucide-react";
import { Home, Wallet } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { fetchAcceptedFriendsWithWallets, getUserProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext'; 
import { v4 as uuidv4 } from 'uuid';
import { addMonths, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import LoanAgreement from "./contract/LoanAgreement";
import { differenceInDays } from 'date-fns';
import 'react-toastify/dist/ReactToastify.css';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import defaultAvatar from '../assets/avatar.png';

export default function FriendLoanRequest() {
  const navigate = useNavigate();
  const location = useLocation();
  const {user} = useAuth();

  const [loanAmount, setLoanAmount] = useState("");
  const [loanAmountError, setLoanAmountError] = useState("");

  const [interestRate, setInterestRate] = useState(5);
  const [interestError, setInterestError] = useState("");

  const [loanTermMonths, setLoanTermMonths] = useState(12);
  const [borrowerName, setBorrowerName] = useState("나");
  const [purposeMessage, setPurposeMessage] = useState("");
  const [isEditingInterestRate, setIsEditingInterestRate] = useState(false);
  
  const [friends, setFriends] = useState([]);
  const [userWalletAddress, setUserWalletAddress] = useState('');
  const [loanAgreementData, setLoanAgreementData] = useState(null);
  const [borrowerProfile, setBorrowerProfile] = useState(null);
  
  useEffect(() => {
    const fetchUserWallet = async () => {
        if (!user?.id) return;

        try {
            const profile = await getUserProfile(user.id);
            setBorrowerProfile(profile);
            setBorrowerName(profile?.name || '나'); // 이름 설정
            setUserWalletAddress(profile.wallet_id);
        
        } catch (err) {
        console.error('🔍 사용자 지갑 주소 조회 실패:', err.message);
        alert(err.message);
        }
    };

    fetchUserWallet();
  }, [user?.id]);


  useEffect(() => {
    const loadFriendWallets = async () => {
        try {
            const profiles = await fetchAcceptedFriendsWithWallets(user?.id);
            setFriends(profiles);
        } catch (err) {
            console.error(err.message);
        }
    };

    loadFriendWallets();
  }, [user?.id]);

  useEffect(() => {
    if (location.state?.nextStep) {
      setCurrentStep(location.state.nextStep);
    }
  }, [location.state]);
  
  // Add state for current step
  const [currentStep, setCurrentStep] = useState(1);

  // Add state for current date and estimated repayment date
  const [currentDate, setCurrentDate] = useState(new Date());
  const [estimatedRepaymentDate, setEstimatedRepaymentDate] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
 const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: "",    // 'success' 또는 'error'
    title: "",
    message: ""
  });
  const [timerProgress, setTimerProgress] = useState(100);

  // ── Friend 페이지에서 가져온 showNotification 함수 ──
  const showNotification = (type, title, message) => {
    setModalContent({ type, title, message });
    setShowModal(true);
    setTimerProgress(100);

    const duration = 3000;   // 모달 지속 시간 (ms)
    const interval = 30;     // Progress Bar 업데이트 빈도 (ms)
    const steps = duration / interval;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      setTimerProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowModal(false);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);
  };
  
  // 오늘 기준으로 "n개월 뒤" 계산한 문자열 (UI에 표시할 때도 사용 가능)
  useEffect(() => {
      if (loanTermMonths > 0) {
        // date-fns의 addMonths 사용 → 말일/윤달을 올바르게 처리
        const repayDate = addMonths(currentDate, loanTermMonths);
        const year = repayDate.getFullYear();
        const month = repayDate.getMonth() + 1; // 0-based → 1~12 숫자
        const day = repayDate.getDate();
        setEstimatedRepaymentDate(`${year}. ${month}. ${day}.`);
      } else {
        setEstimatedRepaymentDate("날짜 미정");
      }
    }, [loanTermMonths, currentDate]);

  const handleLoanAmountChange = (e) => {
    const value = e.target.value.replace(/,/g, ""); // 먼저 모든 콤마 제거
    const numberValue = parseInt(value, 10);

    if (!value || isNaN(numberValue)) {
      setLoanAmount("");
      setLoanAmountError("");
      return;
    }

    if (numberValue < 10000) {
      setLoanAmountError("최소 대출 금액은 10,000원 이상이어야 합니다.");
    } else {
      setLoanAmountError("");
    }

    // 천자리 구분기호 추가
    setLoanAmount(numberValue.toLocaleString());
  };

  const selectAmount = (amount) => {
    if (amount < 10000) {
      setLoanAmountError("최소 대출 금액은 10,000원 이상이어야 합니다.");
      return;
    }
    setLoanAmountError("");
    setLoanAmount(amount.toLocaleString());
  };

  const selectTerm = (term) => {
    setLoanTermMonths(term);
  };

  const calculateTotalRepayment = () => {
    const amount = parseFloat(loanAmount.replace(/,/g, "") || "0");
    const rate = interestRate / 100;
    const months = loanTermMonths;
    const totalInterest = amount * rate * (months / 12);
    const totalRepayment = amount + totalInterest;
    return Math.round(totalRepayment);
  };

  const handleInterestRateChange = (e) => {
    const inputValue = e.target.value;

    // 공백이나 잘못된 숫자 입력 방지
    if (inputValue === "" || isNaN(inputValue)) {
      setInterestRate("");
      setInterestError("");
      return;
    }
    
    const value = parseFloat(e.target.value);
    setInterestRate(value); 
    
    if (value > 20) {
      setInterestError("이자율은 20%를 초과할 수 없습니다.");
    } else {
      setInterestError("");
    }
  };

  const handleInterestRateBlur = () => {
    setIsEditingInterestRate(false);
  };

  const handleInterestRateKeyPress = (e) => {
    if (e.key === 'Enter') {
      setIsEditingInterestRate(false);
    }
  };

  // Function to go to the next step
  const goToNextStep = () => {
    if (currentStep === 1) {
      if (loanAmountError || interestError || !loanAmount || !interestRate) {
      // 기존 Toast 대신 showNotification 사용
        showNotification('error', '입력 오류', '대출 조건을 올바르게 입력해주세요!');        return;
      }
    }

    setCurrentStep(currentStep + 1);
  };

  // Function to go to the previous step
  const goToPreviousStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // Function to handle friend selection (single selection)
  const handleFriendSelect = (id) => {
    setFriends(friends.map(friend =>
      friend.id === id ? { ...friend, isSelected: !friend.isSelected } : { ...friend, isSelected: false } // Toggle selection for clicked friend, deselect others
    ));
  };

  // Find the selected friend
  const selectedFriend = friends.find(friend => friend.isSelected);

   // 대출 요청 생성
  const handleCreateLoan = async () => {
    try {
      if (loanAmountError || interestError || !loanAmount || !interestRate) {
          showNotification('error', '입력 오류', '대출 조건을 다시 확인해주세요!');
        return;
      }


      if (userWalletAddress === selectedFriend.wallet_id) {
        alert('대출자와 차입자는 같은 지갑일 수 없습니다.');
        return;
      }

      const loanId = uuidv4();
      const amount = parseInt(loanAmount.replace(/,/g, ''), 10);

      const today = new Date();
      const durationMonths = Number(loanTermMonths); // 예: 12

      // date-fns의 addMonths를 쓰면 자동으로 말일/윤달을 올바르게 처리해 줌
      const endDate = addMonths(today, durationMonths);

      // 한국어 형식으로 포맷팅
      const formattedToday = format(today, 'yyyy년 M월 d일', { locale: ko });
      const formattedEndDate = format(endDate, 'yyyy년 M월 d일', { locale: ko });

      // 정확한 일수 계산 (differenceInDays 사용)
      const actualDurationDays = differenceInDays(endDate, today);
      // 예: 윤달 포함 시 366, 아니면 365 등 자동 계산

      const loanData = {
        id: loanId,
        lender: selectedFriend.wallet_id,     // 친구가 대출자
        borrower: userWalletAddress,          // 내가 차입자
        amount: amount,
        interestRate: parseFloat(interestRate),
        durationDays: actualDurationDays,
        durationMonths: durationMonths,
        endDateTimestamp: endDate.getTime(),
        message: purposeMessage || "",
      };

      setLoanAgreementData({
        loanData: loanData,
        selectedFriend: selectedFriend,
        borrowerProfile,     
        estimatedRepaymentDate: formattedEndDate,        // "YYYY. M. D." 또는 "yyyy년 M월 d일"
        totalRepayment: calculateTotalRepayment(),
        startDate: formattedToday,
        endDate: formattedEndDate
      });

      setCurrentStep(3); // 계약서 작성

    } catch (error) {
      console.error('대출 정보 생성 실패:', error);
      showNotification('error', '생성 실패', error?.response?.data?.message || error.message);

    }

  };


  return (
    <>
  
    <div className="min-h-screen bg-gray-50" style={{ maxWidth: '600px', margin: '0 auto' }}>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 뒤 배경 어둡게 */}
          <div
            className="fixed inset-0 bg-black opacity-30"
            onClick={() => setShowModal(false)}
          ></div>

          <div className="relative w-full max-w-sm p-6 mx-4 transition-all transform bg-white rounded-lg shadow-xl">
            {/* ─────────── 프로그래스 바 컨테이너 ─────────── */}
            <div className="absolute top-0 left-0 w-full h-1 overflow-hidden bg-gray-200 rounded-t-lg">
              <div
                className="h-full transition-all ease-linear bg-blue-500"
                style={{ width: `${timerProgress}%`, transitionDuration: '30ms' }}
              />
            </div>
            {/* ─────────── 닫기 버튼(X) ─────────── */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute text-gray-400 top-2 right-2 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            {/* ─────────── 아이콘 + 텍스트 영역 ─────────── */}
            <div className="flex items-center gap-3 mt-1">
              {modalContent.type === 'success' ? (
                <CheckCircleIcon className="w-8 h-8 text-green-500" />
              ) : (
                <ExclamationCircleIcon className="w-8 h-8 text-red-500" />
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {modalContent.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {modalContent.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="p-6 bg-white">
        <div className="flex items-center mb-3">
          <div className="flex items-center justify-center w-8 h-8 mr-3 bg-blue-500 rounded-full">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800">친구에게 대출 요청</h1>
        </div>
        <p className="text-sm text-gray-600 ml-11">신뢰할 수 있는 친구로부터 안전하게 대출을 받아보세요</p>
      </div>

      {/* Step Indicator */}
      <div className="px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Step 1 */}
          <div className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold ${currentStep === 1 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>1</div>
            <span className={`ml-2 text-sm font-semibold ${currentStep === 1 ? 'text-blue-500' : 'text-gray-400'}`}>대출 조건</span>
          </div>
          {/* Step 2 */}
          <div className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 2 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>2</div>
            <span className={`ml-2 text-sm ${currentStep === 2 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>친구 선택</span>
          </div>
          {/* Step 3 */}
          <div className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 3 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>3</div>
            <span className={`ml-2 text-sm ${currentStep === 3 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>계약서 작성</span>
          </div>
          <div className="flex items-center">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${currentStep === 4 ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>4</div>
            <span className={`ml-2 text-sm ${currentStep === 4 ? 'text-blue-500 font-semibold' : 'text-gray-400'}`}>요청 전송</span>
          </div>
        </div>
        </div>

      {/* Main Content */}
      <div className="p-6 pb-32">
        {/* Step 1: Loan Conditions */}
        {currentStep === 1 && (
          <>
            {/* Loan Amount Card */}
            <div className="mb-6 overflow-hidden bg-white shadow-md rounded-2xl">
              <div className="flex items-center justify-between p-4 text-white bg-blue-500">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">대출 금액</span>
                </div>
              </div>

              <div className="p-6">
                {/* Loan Amount Input */}
                <div className="mb-6">
                  <div className="flex items-center mb-3">
                    <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">대출 금액</span>
                  </div>

                  <div className="mb-4">
                    <input
                          type="text"
                          value={loanAmount || ""}
                          onChange={handleLoanAmountChange}
                          placeholder="대출할 금액을 입력해주세요"
                          className="w-full pb-2 text-lg text-right text-gray-600 placeholder-gray-400 bg-transparent border-0 border-b-2 border-gray-200 focus:outline-none focus:border-blue-500"
                        />
                    <div className="mt-1 text-sm text-right text-blue-500">KRW</div>
                    {loanAmountError && (
                        <p className="mt-1 text-sm text-red-500">{loanAmountError}</p>
                      )}
                    </div>

                  {/* Amount Buttons */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      className="px-4 py-3 text-sm font-medium text-blue-600 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
                      onClick={() => selectAmount(1000000)}
                    >
                      1,000,000원
                    </button>
                    <button
                      className="px-4 py-3 text-sm font-medium text-blue-600 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
                      onClick={() => selectAmount(3000000)}
                    >
                      3,000,000원
                    </button>
                    <button
                      className="px-4 py-3 text-sm font-medium text-blue-600 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
                      onClick={() => selectAmount(5000000)}
                    >
                      5,000,000원
                    </button>
                    <button
                      className="px-4 py-3 text-sm font-medium text-blue-600 transition-colors border border-blue-200 rounded-lg bg-blue-50 hover:bg-blue-100"
                      onClick={() => selectAmount(10000000)}
                    >
                      10,000,000원
                    </button>
                  </div>

                  <div className="mb-6 text-xs text-gray-500">
                    <svg className="inline w-4 h-4 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                    </svg>
                    친구별 평균 금액: 500~1,000만원
                  </div>

                  {/* Interest Rate Slider */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">희망 이자율</span>
                </div>

    {interestError && (
                            <p className="mt-1 text-sm text-red-500">{interestError}</p>
                          )}

                    {/* Display of current interest rate or input field */}
                    <div className="flex items-center mb-3" onDoubleClick={() => setIsEditingInterestRate(true)}>
                      {isEditingInterestRate ? (
                        <>
                        <input
                          key="interest-rate-input"
                          type="number"
                          max="20"
                          value={interestRate}
                          onChange={handleInterestRateChange}
                          onBlur={handleInterestRateBlur}
                          onKeyPress={handleInterestRateKeyPress}
                          className="w-24 text-3xl font-bold text-gray-800 bg-transparent border-b-2 border-blue-500 focus:outline-none"
                          autoFocus
                          step="0.1"
                        />
                  
                        </>
                      ) : (
                        <>
                          <span className="text-3xl font-bold text-gray-800">{interestRate.toFixed(1)}</span>
                          <span className="text-lg text-gray-600">%</span>
                           <button
                             onClick={() => setIsEditingInterestRate(true)}
                             className="p-1 ml-2 rounded-md hover:bg-gray-100 focus:outline-none"
                             aria-label="Edit Interest Rate"
                           >
                             <Edit className="w-4 h-4 text-gray-500" />
                           </button>
                        </>
                      )}
              </div>

                    {/* The actual range slider input */}
                <input
                  type="range"
                  min="0"
                  max="20"
                        step="0.1"
                        value={interestRate}
                        onChange={handleInterestRateChange}
                        className="w-full h-2 mt-3 bg-blue-100 rounded-lg appearance-none cursor-pointer"
                        style={{
                          '--tw-ring-color': '#3b82f6',
                          '--tw-ring-opacity': '1',
                          '--tw-ring-offset-width': '2px',
                          '--tw-ring-offset-color': '#fff'
                        }}
                    />
   
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>무이자 0%</span>
                      <span>저금리 3%</span>
                      <span>적정금리 5%</span>
                      <span>협의</span>
                </div>
              </div>

                  {/* Loan Term */}
                  <div className="mb-6">
                    <div className="flex items-center mb-3">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">상환 기간</span>
                    </div>

                    <div className="flex items-center mb-4">
                <select
                        value={loanTermMonths}
                        onChange={(e) => setLoanTermMonths(parseInt(e.target.value))}
                        className="w-20 px-3 py-2 mr-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-500"
                      >
                        <option value={3}>3</option>
                        <option value={6}>6</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                        <option value={36}>36</option>
                      </select>
                      <span className="mr-auto text-sm text-gray-600">개월</span>
                      <div className="flex items-center text-sm text-blue-500">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span>상환일</span>
                        {/* Display estimated repayment date below loan term */}
                        <span className="ml-2 font-semibold">{estimatedRepaymentDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {[3, 6, 12, 24, 36].map((term) => (
                        <button
                          key={term}
                          className={`py-2 px-4 rounded-full text-xs font-medium transition-colors ${
                            loanTermMonths === term
                              ? 'bg-blue-50 text-blue-600 border border-blue-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                          }`}
                          onClick={() => selectTerm(term)}
                        >
                          {term}개월
                        </button>
                      ))}
                      <button className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 border border-gray-200 rounded-full hover:bg-gray-200">
                        직접입력
                      </button>
                    </div>
              </div>

                  {/* Personal Information */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                      <div className="flex items-center mb-2">
                        <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">대출자 (본인의 이름)</span>
                      </div>
                  <input
                    type="text"
                        value={borrowerName}
                        onChange={(e) => setBorrowerName(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-blue-500"
                  />
                </div>
         
              </div>

                  {/* Purpose Message */}
                  <div className="mb-6">
                    <div className="flex items-center mb-2">
                      <svg className="w-4 h-4 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">요청 메시지</span>
                      <span className="ml-auto text-xs text-gray-500">(선택사항)</span>
                    </div>
                <textarea
                      placeholder="친구에게 전달할 메시지를 입력하세요"
                      value={purposeMessage}
                      onChange={(e) => setPurposeMessage(e.target.value)}
                      className="w-full h-20 px-3 py-3 text-sm placeholder-gray-400 border border-gray-200 rounded-lg resize-none bg-gray-50 focus:outline-none focus:border-blue-500"
                      maxLength={300}
                    />
                    <div className="mt-1 text-xs text-right text-gray-500">{purposeMessage.length}/300자</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Loan Summary */}
            <div className="p-6 mb-24 bg-white shadow-md rounded-2xl">
              <h3 className="mb-6 font-semibold text-gray-800">대출 요청 요약</h3>

              <div className="grid grid-cols-3 pb-4 mb-4 text-center border-b border-gray-200">
                <div>
                  <div className="text-lg font-bold text-blue-500">{loanAmount ? parseFloat(loanAmount.replace(/,/g, "")).toLocaleString() + "원" : "0원"}</div>
                  <div className="text-sm text-gray-600">대출 금액</div>
                </div>
                <div>
                   <div className="text-lg font-bold text-blue-500">{interestRate}%</div>
                  <div className="text-sm text-gray-600">연 이자율</div>
                </div>
                <div>
                   <div className="text-lg font-bold text-blue-500">{loanTermMonths}개월</div>
                  <div className="text-sm text-gray-600">상환 기간</div>
                     {/* Display estimated repayment date below loan term */}
                     {estimatedRepaymentDate !== '날짜 미정' && (
                       <div className="mt-1 text-xs text-gray-500">({estimatedRepaymentDate}까지)</div>
                     )}
                </div>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">예상 총 상환액</span>
                  <div className="text-xl font-bold text-gray-800">
                    {calculateTotalRepayment().toLocaleString()}원
                  </div>
                </div>
              </div>
              </div>
            </>
          )}

        {/* Step 2: Friend Selection */}
        {currentStep === 2 && (
            <div className="p-6 mb-6 overflow-hidden bg-white shadow-md rounded-2xl">
                {/* Header for Step 2 */}
                 <div className="flex items-center mb-3">
                     <div className="flex items-center justify-center w-8 h-8 mr-3 bg-blue-500 rounded-full">
                       <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                         <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                       </svg>
                     </div>
                     <h2 className="mr-auto text-xl font-bold text-gray-800">친구를 선택해주세요</h2>
                     {/* Previous Step Button */}
                      <button
                        onClick={goToPreviousStep}
                        className="flex items-center text-sm text-blue-500 transition-colors hover:text-blue-600"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        이전으로
                      </button>
                 </div>
                 <p className="mb-6 text-sm text-gray-600 ml-11">신뢰할 수 있는 친구를 선택해 대출 요청을 보내세요</p>

                {/* Search Input */}
                 <div className="mb-6">
                     <div className="relative">
                         <Search className="absolute w-4 h-4 text-gray-400 transform -translate-y-1/2 left-3 top-1/2" />
                         <input
                             type="text"
                             placeholder="이름 또는 전화번호로 검색"
                             value={searchQuery}
                             onChange={(e) => setSearchQuery(e.target.value)}
                             className="w-full py-3 pl-10 pr-4 text-sm placeholder-gray-400 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                         />
                     </div>
                 </div>

                {/* My Friends Section */}
                <div>
                    <div className="flex items-center mb-4 text-gray-700">
                         <svg className="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                             <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM4.5 7A2.5 2.5 0 102 4.5 2.503 2.503 0 004.5 7zM5 14a5.002 5.002 0 01-2.326-1L7 13v1h1l1 5H3v-2z" />
                         </svg>
                        <span className="mr-2 font-semibold">내 전체 친구</span>
                         <span className="text-sm text-gray-500">(총 {friends.length}명)</span>
                    </div>
                    {/* Friend list items */}
                    <div className="pr-2 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 480px)' }}>
                         {/* Display message if no friends found */}
                         {friends.filter(friend => friend.name.includes(searchQuery) || friend.phone.includes(searchQuery)).map(friend => (
                             <div key={friend.id} className="flex items-center p-4 rounded-lg bg-gray-50">
                                  <img src={defaultAvatar} alt={friend.name} className="w-10 h-10 mr-4 rounded-full"/>
                                  <div className="flex-1">
                                       <div className="font-medium text-gray-800">{friend.name}</div>
                                       <div className="text-sm text-gray-500">{friend.phone}</div>
                                  </div>
                                  <button
                                    className={`text-sm py-2 px-4 rounded-full ${friend.isSelected ? 'bg-blue-500 text-white' : 'bg-white text-blue-500 border border-blue-300'}`}
                                    onClick={() => handleFriendSelect(friend.id)}
                                  >
                                    {friend.isSelected ? '✓ 선택' : '○ 선택'}
                                  </button>
                             </div>
                         ))}
                          {/* Display message if no friends found */}
                          {friends.filter(friend => friend.name.includes(searchQuery) || friend.phone.includes(searchQuery)).length === 0 && searchQuery !== '' && (
                              <div className="text-center text-gray-500">검색 결과가 없습니다.</div>
                          )}
                     </div>
                </div>
             </div>
        )}

        {currentStep === 3 && loanAgreementData && (
          <LoanAgreement
            loanData={loanAgreementData.loanData}
            selectedFriend={loanAgreementData.selectedFriend}
            borrowerProfile={borrowerProfile}
            estimatedRepaymentDate={loanAgreementData.estimatedRepaymentDate}
            totalRepayment={loanAgreementData.totalRepayment}
            startDate={loanAgreementData.startDate}
            endDate={loanAgreementData.endDate}
            goToPreviousStep={() => setCurrentStep(2)}
            goToNextStep={() => setCurrentStep(4)}
          />
        )}

        {/* Step 4: Request Submission (Placeholder) */}
        {currentStep === 4 && (
            <div className="flex flex-col items-center p-6 overflow-hidden text-center bg-white shadow-md rounded-2xl">
                 {/* Checkmark Icon with enhanced animated background (Ripple effect) */}
                 <div className="relative flex items-center justify-center w-24 h-24 mb-6"> {/* Container for icon and background */}
                   {/* Animated Background Circles (Ripple) */}
                   <div className="absolute w-full h-full bg-blue-400 rounded-full opacity-70 animate-ping"></div> {/* Ping effect circle */}
                   <div className="absolute w-full h-full delay-75 bg-blue-500 rounded-full opacity-70 animate-pulse"></div> {/* Slightly delayed pulse */}
                   <div className="absolute w-full h-full delay-150 bg-blue-600 rounded-full opacity-70 animate-pulse"></div> {/* More delayed pulse */}
                   {/* Checkmark Icon */}
                   <CheckCircle className="relative z-10 w-16 h-16 text-white"/> {/* Checkmark Icon, increased text color for contrast */}
                 </div>
                 <h2 className="mb-2 text-2xl font-bold text-gray-800">요청 전송이 완료되었습니다</h2>
                 <p className="mb-6 text-sm text-gray-600">신청하신 대출 요청이 정상적으로 친구에게 전송되었습니다.<br/>요청 내역은 <span className="font-semibold text-blue-600">내 대출 관리</span> 에서 확인하실 수 있습니다.</p>

                {/* Summary Card */}
                <div className="w-full p-4 mb-6 rounded-lg bg-gray-50">
                    {/* Friend Info - Centered */}
                    <div className="flex flex-col items-center mb-4"> {/* Changed to flex-col and items-center for centering */}
                         <img src={selectedFriend?.avatar} alt="Friend Avatar" className="w-16 h-16 mb-2 rounded-full"/> {/* Increased size slightly */}
                         <div>
                              <div className="font-medium text-center text-gray-800">{selectedFriend?.name}</div> {/* Centered text */}
                              <div className="text-sm text-center text-gray-500">{selectedFriend?.phone}</div> {/* Centered text */}
                         </div>
                    </div>
                    {/* Loan Details - Left-aligned labels, Right-aligned values */}
                    <div className="grid grid-cols-3 gap-2 text-sm text-gray-600"> {/* Removed text-center class from container */}
                         <div className="text-left">대출금액</div> {/* Explicitly left-aligned */}
                         <div className="col-span-2 font-semibold text-right text-gray-800">{loanAmount ? parseFloat(loanAmount.replace(/,/g, "")).toLocaleString() + "원" : "0원"}</div> {/* Right-aligned */}
                         <div className="text-left">이자율</div> {/* Explicitly left-aligned */}
                         <div className="col-span-2 font-semibold text-right text-gray-800">{interestRate.toFixed(1)}%</div> {/* Changed to text-right */}
                         <div className="text-left">상환 기간</div> {/* Explicitly left-aligned */}
                         <div className="col-span-2 font-semibold text-right text-gray-800">{loanTermMonths}개월</div> {/* Changed to text-right */}
                    </div>
                </div>

            </div>
        )}

      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-[220px] right-0 p-6 bg-white border-t border-gray-100">
        <div className="flex gap-3 justify-center max-w-[600px] mx-auto">
          {currentStep === 1 && (
            <>
               <button className="flex-1 py-4 font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200">
                 임시저장
               </button>
               <button
                 className="flex items-center justify-center flex-1 px-6 py-4 font-semibold text-white transition-colors bg-blue-500 rounded-xl hover:bg-blue-600"
                 onClick={goToNextStep}
               >
                 다음 단계: 친구 선택
                 <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
               </button>
             </>
          )}
           {currentStep === 2 && (
             <>
               <button className="flex-1 py-4 font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200">
                 임시저장
               </button>
                <button
                 className="flex items-center justify-center flex-1 px-6 py-4 font-semibold text-white transition-colors bg-blue-500 rounded-xl hover:bg-blue-600"
                 onClick={handleCreateLoan}
                 disabled={!selectedFriend}
               >
                 다음 단계: 계약서 작성하기 
                 <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                   <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                 </svg>
              </button>
            </>
           )}
           {currentStep === 4 && (
             <>
               <button 
                 onClick={() => navigate('/financialstatus')}
                 className="flex items-center justify-center flex-1 py-4 font-semibold text-blue-600 transition-colors bg-blue-50 rounded-xl hover:bg-blue-100">
                 <Wallet className="w-5 h-5 mr-2"/>자금현황
               </button>
               <button 
                 onClick={() => navigate('/dashboard')}
                 className="flex items-center justify-center flex-1 py-4 font-semibold text-gray-700 transition-colors bg-gray-100 rounded-xl hover:bg-gray-200">
                 <Home className="w-5 h-5 mr-2"/>홈으로
              </button>
            </>
          )}
        </div>
      </div>
    </div>
    </>
  );
}