import { useState, useEffect, useRef } from "react";
import { useAuth } from '../../contexts/AuthContext';
import { createLoan, getUserProfile, approveLoan, denyLoan, downloadAndSaveContract } from '../../services/api';
import DetailedContract from "./DetailedContract";
import SignatureModal from "./SignatureModal";
import { X, FileText, PenTool } from "lucide-react";
import html2canvas from "html2canvas";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

export default function LoanAgreement({
  loanData,
  selectedFriend,
  borrowerProfile,
  estimatedRepaymentDate,
  totalRepayment,
  startDate,
  endDate,
  goToPreviousStep,
  goToNextStep,
  onClose,      // 모달 닫기 콜백
  onApprove,    // 승인 시 호출될 콜백
  onReject      // 거절 시 호출될 콜백
}) {

  const [showDetailedContract, setShowDetailedContract] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [currentSigner, setCurrentSigner] = useState(null);
  const [signatures, setSignatures] = useState({
    lender: null,
    borrower: null
  });
 
  const [isRequesting, setIsRequesting] = useState(false);
  const { user } = useAuth();
  
  const [myProfile, setMyProfile] = useState(null); // 현재 로그인된 사용자의 프로필
   
  // 내 프로필 가져오기 (Supabase)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      try {
        const profile = await getUserProfile(user.id);
        setMyProfile(profile);
      } catch (err) {
        console.error("내 프로필 조회 실패:", err);
      }
    })();
  }, [user]);
  
  useEffect(() => {
    // 대출자(갑), 채무자(을) user_id로 서명 불러오기
    const fetchSignatures = async () => {
      if (!selectedFriend?.id || !user?.id) return;
      const { data: lenderSig } = await supabase
        .from('signatures')
        .select('signature_data')
        .eq('user_id', selectedFriend.id)
        .single();
      const { data: borrowerSig } = await supabase
        .from('signatures')
        .select('signature_data')
        .eq('user_id', user.id)
        .single();
      setSignatures({
        lender: lenderSig?.signature_data ? `data:image/svg+xml;base64,${lenderSig.signature_data}` : null,
        borrower: borrowerSig?.signature_data ? `data:image/svg+xml;base64,${borrowerSig.signature_data}` : null
      });
    };
    fetchSignatures();
  }, [selectedFriend?.id, user?.id]);
  
  const contractData = {
    amount: loanData?.amount || "0",
    interestRate: loanData?.interestRate || "0",
    durationMonths: loanData?.durationMonths || "0",
    bankAccount: "신한은행 123-456-789012 (예금주: 김가환)",

    // (1) 대출자(채권자) 정보: 선택된 친구 프로필에서 가져옴
    lenderName: selectedFriend?.name || "",
    lenderSSN: selectedFriend?.birth_number
        ? `${selectedFriend.birth_number}-${"*".repeat(7)}`
        : "010404-*******",
    lenderPhone: selectedFriend?.phone || "010-8674-7678",
    lenderAddress: selectedFriend?.address || "충남 천안시 서북구",

    // (2) 채무자 정보: borrowerProfile에서 가져온다
    borrowerName: borrowerProfile?.name || "",
    borrowerSSN: borrowerProfile?.birth_number
      ? `${borrowerProfile.birth_number}-${"*".repeat(7)}`
      : "",
    borrowerPhone: borrowerProfile?.phone || "",
    borrowerAddress: borrowerProfile?.address || "",

    guarantor: "김보증 (주민등록번호: 010120-3******, 주소: 충남 천안시 서북구)"
  };

  const handleClose = () => {
    // 팝업을 닫고 이전 단계로 돌아가기
    window.history.back();
  };
  
  const handleDocumentClick = () => {
    setShowDetailedContract(true);
  };

  const handleCloseDetailed = () => {
    setShowDetailedContract(false);
  };

  const handleSaveSignature = (signatureData) => {
    setSignatures(prev => ({
      ...prev,
      [currentSigner]: signatureData
    }));
  };
   // ────────────────────────────────────────────────
  // 3) off‐screen(DOM에 보이지 않는) 상태로 DetailedContract 내용을 렌더링할 ref
  //    이 ref에 연결된 DOM을 html2canvas로 캡처하면 DetailedContract 전체가 그림으로 생성됨
  // ────────────────────────────────────────────────
  const downloadRef = useRef(null);

  // 4) 대출 생성 + 계약서 다운로드 + 서버 전송
  const handleSendLoan = async () => {
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      // (1) DetailedContract 내용을 캡처해서 자동 다운로드
      if (downloadRef.current) {
        // DOM이 충분히 그려질 시간을 100ms 정도 줍니다
        await new Promise(resolve => setTimeout(resolve, 100));

        const canvas = await html2canvas(downloadRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });

        // Blob을 만들어서 자동 다운로드
        await new Promise(res => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `대출계약서_${contractData.lenderName}_${contractData.borrowerName}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
            res(null);
          }, 'image/png');
        });

        // (2) 같은 canvas 객체에서 Base64 추출 → 서버에 보낼 준비
        const base64DataUrl = canvas.toDataURL('image/png');

        // (3) createLoan API 요청 (서버에서 Base64 받아서 해시 저장 로직이 있어야 함)
        const result = await createLoan({
          ...loanData,
          contractImage: base64DataUrl
        });

        console.log('📦 대출 생성 결과:', result);
        alert('대출 요청되었습니다.');
        goToNextStep(4);
      }
    } catch (error) {
      console.error('대출 생성 실패:', error);
      alert('대출 생성 실패: ' + (error?.message || error));
    } finally {
      setIsRequesting(false);
    }
  };
  

    // “승인하기” 버튼 클릭 핸들러
  const handleApprove = async () => {
    if (isRequesting) return;
    setIsRequesting(true);

    try {
      // ─────────────── (1) 오프스크린 DetailedContract 캡처 + 자동 다운로드 ───────────────
      if (downloadRef.current) {
        // DOM이 충분히 렌더링될 시간을 잠시 주기 (100ms 정도)
        await new Promise((resolve) => setTimeout(resolve, 100));

        // html2canvas로 캡처
        const canvas = await html2canvas(downloadRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
        });

        // Blob으로 변환 후 자동 다운로드
        await new Promise((res) => {
          canvas.toBlob((blob) => {
            if (blob) {
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `대출계약서_${loanData.lender}_${loanData.borrower}.png`;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            }
            res(null);
          }, "image/png");
        });

        // 동일한 canvas 객체에서 Base64 문자열 추출
        const base64DataUrl = canvas.toDataURL("image/png");

        // (2) 서버에 계약서 저장 + 해시 남기기 (예: downloadAndSaveContract API 사용)
        //    downloadAndSaveContract 함수가 (loanId, contractImage) 형태로 정의되어 있어야 함
        await downloadAndSaveContract(loanData.id, base64DataUrl);
      }

      // ─────────────── (3) 실제 승인 API 호출 (부모 콜백) ───────────────
      await onApprove();

      // 모달 닫기
      onClose();
    } catch (error) {
      console.error("승인 처리 실패:", error);
      alert("승인 중 오류가 발생했습니다.");
    } finally {
      setIsRequesting(false);
    }
  };

  // 계약서 거절 처리
  const handleReject = async () => {
    setIsRequesting(true);
    try {
      await denyLoan(loanData.id);
      onReject();   // 부모에게 “거절됨”을 알리는 콜백 호출
    } catch (error) {
      console.error("거절 처리 실패:", error);
      alert("거절 중 오류가 발생했습니다.");
    } finally {
      setIsRequesting(false);
    }
  };

  // 현재 로그인된 사용자가 “대출자(채권자)” 인지 여부 확인
  const isLender = myProfile?.wallet_id === loanData.lender;
  // 6) 현재 로그인된 사용자가 “차입자”인지 체크
  const isBorrower = myProfile?.wallet_id === loanData.borrower;
  
  return (
    <>
      {showDetailedContract ? (
        <DetailedContract
          contractData={contractData} 
          onClose={handleCloseDetailed}
          signatures={signatures}
        />
      ) : (
        <div className="flex items-center justify-center min-h-screen p-4 font-sans bg-gray-500 bg-opacity-60">
          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl">
            {/* Close Button */}
            <button 
              onClick={handleClose}
              className="absolute z-10 text-gray-500 top-4 right-4 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Header */}
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 transform rotate-45 bg-black"></div>
                <h1 className="text-base font-semibold text-gray-900">깐부대출</h1>
              </div>
            </div>
            
            {/* Document Preview Section */}
            <div className="px-6 pb-2">
              <div className="relative p-4 mb-4 rounded-lg bg-gray-50 contract-preview">
                <div className="flex justify-center mb-4">
                  <div className="relative cursor-pointer" onClick={handleDocumentClick}>
                    <div className="flex flex-col justify-between w-24 h-32 p-2 bg-white border border-gray-200 rounded-sm shadow-sm">
                      <div className="space-y-1">
                        <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
                        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
                        <div className="h-0.5 bg-gray-300 rounded w-1/2"></div>
                        <div className="h-0.5 bg-gray-300 rounded w-2/3"></div>
                      </div>
                      <div className="space-y-1">
                        <div className="h-0.5 bg-gray-300 rounded w-2/3"></div>
                        <div className="h-0.5 bg-gray-300 rounded w-full"></div>
                        <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
                      </div>
                    </div>
                    <div className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Contract Details */}
              <div className="space-y-4">
                {/* Parties Information */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Creditor (갑) */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-900">(갑)채권자</h3>
                    <div className="space-y-1.5 text-xs">
                     <div className="flex justify-between">
                      <span className="text-gray-600">이름</span>
                      <span className="font-medium text-right text-gray-900">{contractData.lenderName}</span>
                    </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">주소</span>
                        <span className="font-medium text-right text-gray-900">{contractData.lenderAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">주민등록번호</span>
                        <span className="text-right text-gray-900">{contractData.lenderSSN}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">연락처</span>
                        <span className="text-right text-gray-900">{contractData.lenderPhone}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Debtor (을) */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-900">(을)채무자</h3>
                    <div className="space-y-1.5 text-xs">
                     <div className="flex justify-between">
                        <span className="text-gray-600">이름</span>
                        <span className="font-medium text-right text-gray-900">{contractData.borrowerName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">주소</span>
                        <span className="font-medium text-right text-gray-900">{contractData.borrowerAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">주민등록번호</span>
                        <span className="text-right text-gray-900">{contractData.borrowerSSN}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">연락처</span>
                        <span className="text-right text-gray-900">{contractData.borrowerPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Loan Terms */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 text-xs gap-x-4 gap-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">계약 날짜</span>
                      <span className="font-medium text-gray-900">{startDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">대출 금액</span>
                      <span className="font-medium text-gray-900">{contractData.amount}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">이자율</span>
                      <span className="font-medium text-gray-900">연{contractData.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">변제 방법</span>
                      <span className="font-medium text-gray-900">계약이체</span>
                    </div>
                  </div>
                </div>
                
                {/* Legal Notice */}
                <div className="px-2 py-2 text-xs text-center text-gray-500">
                  본 계약은 상기 조건에 따라 대출이 적용될 수 있습니다. 모든 사항<br />
                  관련 법적 절차 기준으로 하였습니다.
                </div>
                
                {/* Main Action Button */}
                <div className="pt-2 pb-4">
                {/* 8) 차입자(Borrower)인 경우, “대출 요청하기” 버튼 */}
                {isBorrower && (
                  <button
                    onClick={handleSendLoan}
                    disabled={isRequesting}
                    className={`px-6 py-3 text-sm font-medium text-white rounded-lg ${
                      isRequesting ? "bg-gray-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isRequesting ? "요청 중..." : "대출 요청하기"}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={downloadRef}
        style={{
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          width: '840px',    // DetailedContract 내부의 max-w-4xl(≈ 768px) 보다 살짝 넉넉하게
          padding: '0',
          margin: '0'
        }}
      >
        <DetailedContract
          contractData={contractData}
          onClose={() => {}}
          signatures={signatures}
          showActions={false}  // ★ 버튼을 렌더링하지 않도록 false로 설정
        />
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSaveSignature}
        />
      )}

          {/* ───── 하단 버튼: “승인/거절”은 채권자에게만 보여줘야 함 ───── */}
        {isLender && (
          <div className="flex items-center justify-end gap-4 px-6 py-4 border-t bg-gray-50">
            <button
              onClick={handleReject}
              disabled={isRequesting}
              className="px-6 py-3 text-sm font-medium text-red-600 rounded-lg bg-red-50 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              거절하기
            </button>
            <button
              onClick={handleApprove}
              disabled={isRequesting}
              className="px-6 py-3 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              승인하기
            </button>
          </div>
        )}
    </>
  );
}