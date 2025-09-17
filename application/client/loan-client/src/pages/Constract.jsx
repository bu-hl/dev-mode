// import { X, FileText, Edit3, PenTool, Download } from "lucide-react";
// import { useState, useRef, useEffect } from "react";
// import html2canvas from "html2canvas";
// import { useLocation } from "react-router-dom";
// import { useAuth } from "../contexts/AuthContext";
// import { createLoan } from '../services/api';


// // Signature Modal Component
// function SignatureModal({ onClose, onSave }) {
//   const canvasRef = useRef(null);
//   const [isDrawing, setIsDrawing] = useState(false);
//   const [context, setContext] = useState(null);
 
//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const ctx = canvas.getContext('2d');
//     ctx.strokeStyle = '#000000';
//     ctx.lineWidth = 2;
//     ctx.lineCap = 'round';
//     ctx.lineJoin = 'round';
//     setContext(ctx);
//   }, []);

//   const startDrawing = (e) => {
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
    
//     context.beginPath();
//     context.moveTo(x, y);
//     setIsDrawing(true);
//   };

//   const draw = (e) => {
//     if (!isDrawing) return;
    
//     const canvas = canvasRef.current;
//     const rect = canvas.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
    
//     context.lineTo(x, y);
//     context.stroke();
//   };

//   const stopDrawing = () => {
//     setIsDrawing(false);
//   };

//   const clearSignature = () => {
//     const canvas = canvasRef.current;
//     context.clearRect(0, 0, canvas.width, canvas.height);
//   };

//   const saveSignature = () => {
//     const canvas = canvasRef.current;
//     const signatureData = canvas.toDataURL('image/png');
//     onSave(signatureData);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
//       <div className="w-full max-w-md p-6 bg-white rounded-lg shadow-xl">
//         <div className="flex items-center justify-between mb-4">
//           <h2 className="text-lg font-semibold">서명하기</h2>
//           <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
//             <X className="w-5 h-5" />
//           </button>
//         </div>
        
//         <div className="mb-4">
//           <canvas
//             ref={canvasRef}
//             width={400}
//             height={200}
//             className="w-full border border-gray-300 rounded-lg"
//             onMouseDown={startDrawing}
//             onMouseMove={draw}
//             onMouseUp={stopDrawing}
//             onMouseLeave={stopDrawing}
//           />
//         </div>
        
//         <div className="flex justify-end gap-2">
//           <button
//             onClick={clearSignature}
//             className="px-4 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
//           >
//             지우기
//           </button>
//           <button
//             onClick={saveSignature}
//             className="px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
//           >
//             저장하기
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // Detailed Contract Component
// function DetailedContract({ contractData, onClose, signatures }) {
//   const contractRef = useRef(null);

//   const handleDownload = async () => {
//     if (contractRef.current) {
//       try {
//         const canvas = await html2canvas(contractRef.current, {
//           scale: 2,
//           useCORS: true,
//           logging: false,
//           backgroundColor: "#ffffff"
//         });
        
//         canvas.toBlob((blob) => {
//           const url = window.URL.createObjectURL(blob);
//           const link = document.createElement('a');
//           link.href = url;
//           link.download = `대출계약서_${contractData.lenderName}_${contractData.borrowerName}.png`;
//           document.body.appendChild(link);
//           link.click();
//           document.body.removeChild(link);
//           window.URL.revokeObjectURL(url);
//         }, 'image/png');
//       } catch (error) {
//         console.error('Error generating image:', error);
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Header with actions */}
//       <div className="sticky top-0 z-10 bg-white border-b">
//         <div className="flex items-center justify-between max-w-4xl px-8 py-4 mx-auto">
//           <h1 className="text-xl font-bold">대출 계약서</h1>
//           <div className="flex items-center gap-4">
//             <button
//               onClick={handleDownload}
//               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
//             >
//               <Download className="w-4 h-4" />
//               이미지 다운로드
//             </button>
//             <button
//               onClick={onClose}
//               className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
//             >
//               <X className="w-4 h-4" />
//               닫기
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Contract Content */}
//       <div ref={contractRef} className="max-w-4xl p-8 mx-auto bg-white">
//         <h1 className="mb-8 text-2xl font-bold text-center">대차(대출) 계약서</h1>
        
//         <div className="space-y-6 text-sm">
//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제1조(목적)</h2>
//             <p className="leading-relaxed">
//               본 계약은 채권자(갑)와 채무자(을) 간에 금전 대차 관계를 설정하고, 그에 따른 권리·의무 및 상환 방법 등을 규정함을 목적으로 한다.
//             </p>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제2조(용어의 정의)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>"대출금"이라 함은 본 계약에 따라 채권자(갑)가 채무자(을)에게 지급하는 금전을 말한다.</li>
//               <li>"이자율"이라 함은 연 단위 이자율을 의미하며, 본 계약 제3조에 정한 바에 따른다.</li>
//               <li>"연체이자율"이라 함은 채무자가 본 계약상의 상환기한을 초과할 경우 적용되는 가산 이자율을 말한다.</li>
//               <li>"상환"이라 함은 대출금 및 이자를 계약상 정해진 날짜까지 채무자가 채권자에게 지급하는 것을 말한다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제3조(대출 금액 및 이자율)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>채권자(갑)는 채무자(을)에게 금 {contractData.amount}원(￦{contractData.amount})을 대출하기로 한다.</li>
//               <li>대출금에 대한 연 이자율은 {contractData.interestRate}%로 한다.</li>
//               <li>이자는 "대출 실행일"부터 "상환 완료일"까지 일수로 계산하며, 1년은 365일로 본다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제4조(상환 기한 및 방법)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>채무자(을)는 대출 실행일로부터 {contractData.duration}개월 이내에 대출원금과 이자를 전액 상환하여야 한다.</li>
//               <li>상환 방법은 아래 중 하나를 따른다.
//                 <ol className="pl-5 mt-2 list-decimal">
//                   <li>일시상환: 만기일(대출 실행일로부터 {contractData.duration}개월)까지 원금과 이자를 일시에 상환한다.</li>
//                   <li>분할상환: 매 {contractData.duration/2}개월마다 원금을 균등 분할하여 납부하고, 이자는 매 회 분할상환일에 함께 납부한다.</li>
//                 </ol>
//               </li>
//               <li>상환은 "{contractData.bankAccount}" 계좌로 이체함을 원칙으로 한다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제5조(연체 이자 및 연체 시 조치)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>채무자(을)가 상환기한을 초과하여 상환하지 않을 경우, 초과일수에 대하여 연 {contractData.interestRate * 1.5}%의 연체이자가 추가로 부과된다.</li>
//               <li>채무자(을)는 연체 발생일로부터 발생한 모든 연체이자를 즉시 추가 상환해야 하며, 미납 시 채권자(갑)는 즉시 법적 조치를 취할 수 있다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제6조(중도상환 및 수수료)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>채무자(을)는 약정 상환기한 이전에 대출금 전액 또는 일부를 중도상환할 수 있다.</li>
//               <li>중도상환 시에는 잔여원금의 1%에 해당하는 금액을 중도상환 수수료로 지급해야 한다.</li>
//               <li>채무자가 중도상환하려는 경우, 최소 7일 이전에 채권자(갑)에게 사전 통보해야 한다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제7조(계약 해제·해지)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>채무자(을)가 아래 각 호의 어느 하나에 해당할 때, 채권자(갑)는 즉시 본 계약을 해지할 수 있다.
//                 <ol className="pl-5 mt-2 list-decimal">
//                   <li>본 계약상의 채무를 30일 이상 연체한 경우</li>
//                   <li>본 계약과 관련하여 중대한 허위 사실을 고지한 경우</li>
//                   <li>그 밖에 채권자가 계약을 계속 유지하기 어려운 중대한 사유가 발생한 경우</li>
//                 </ol>
//               </li>
//               <li>제1항에 따라 계약이 해지된 경우, 채무자(을)는 해지 통보일로부터 7일 이내에 잔여 원금 및 이자를 즉시 상환하여야 하며, 미상환 시 채권자(갑)는 법적 절차를 진행할 수 있다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제8조(보증인 및 담보)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>본 대출을 보증하기 위하여 "{contractData.guarantor}"를 보증인으로 지정한다.</li>
//               <li>보증인은 채무자(을)가 본 계약상의 의무를 이행하지 않을 경우, 채권자(갑)가 직접 보증인에게 대출금·이자를 청구할 수 있다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-2 text-lg font-semibold">제9조(기타 약정사항)</h2>
//             <ol className="pl-5 space-y-2 list-decimal">
//               <li>본 계약에 명시되지 않은 사항은 민법·상법 및 기타 관계 법령의 규정에 따른다.</li>
//               <li>본 계약의 일부 조항이 무효로 되더라도, 그 밖의 조항은 여전히 유효하며 효력을 가진다.</li>
//               <li>본 계약과 관련하여 분쟁이 발생할 경우 채권자(갑) 주소지를 관할하는 법원을 제1심 합의 관할 법원으로 한다.</li>
//             </ol>
//           </section>

//           <section>
//             <h2 className="mb-4 text-lg font-semibold">제10조(인감 및 서명)</h2>
//             <p className="mb-6">채권자(갑) 및 채무자(을)는 본 계약서를 충분히 검토·숙지하였으며, 상기 기재된 모든 조항에 동의함을 확인하고 서명 또는 전자서명을 날인한다.</p>
            
//             <div className="grid grid-cols-2 gap-8">
//               <div>
//                 <h3 className="mb-4 font-semibold">채권자(갑)</h3>
//                 <div className="space-y-2">
//                   <p>이름: {contractData.lenderName}</p>
//                   <p>주민등록번호: {contractData.lenderId}</p>
//                   <p>연락처: {contractData.lenderPhone}</p>
//                   <div className="pt-4 mt-4 border-t">
//                     {signatures.lender ? (
//                       <img src={signatures.lender} alt="채권자 서명" className="max-h-20" />
//                     ) : (
//                       <p className="text-center text-gray-400">(서명)</p>
//                     )}
//                   </div>
//                 </div>
//               </div>
              
//               <div>
//                 <h3 className="mb-4 font-semibold">채무자(을)</h3>
//                 <div className="space-y-2">
//                   <p>이름: {contractData.borrowerName}</p>
//                   <p>주민등록번호: {contractData.borrowerId}</p>
//                   <p>연락처: {contractData.borrowerPhone}</p>
//                   <div className="pt-4 mt-4 border-t">
//                     {signatures.borrower ? (
//                       <img src={signatures.borrower} alt="채무자 서명" className="max-h-20" />
//                     ) : (
//                       <p className="text-center text-gray-400">(서명)</p>
//                     )}
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </section>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default function LoanAgreement() {
//   const [showDetailedContract, setShowDetailedContract] = useState(false);
//   const [showSignatureModal, setShowSignatureModal] = useState(false);
//   const [currentSigner, setCurrentSigner] = useState(null);
//   const [signatures, setSignatures] = useState({
//     lender: null,
//     borrower: null
//   });
//   const location = useLocation();
//   const { user } = useAuth();
//   const isLoggedIn = !!user;

//   const {
//     currentStep,
//     loanData,
//     selectedFriend,
//     estimatedRepaymentDate,
//     totalRepayment,
//   } = location.state || {};

//   const contractData = {
//     amount: loanData?.amount || "0",
//     interestRate: loanData?.interest || "0",
//     duration: loanData?.duration || "0",
//     bankAccount: "신한은행 123-456-789012 (예금주: 김가환)",
//     lenderName: loanData?.lender || "",
//     lenderSSN : selectedFriend?.birth_number || "010120-3******",
//     lenderPhone: selectedFriend?.phone || "010-8674-7678",
//     borrowerName: user?.name || "",
//     borrowerSSN: user?.birth_number || "010120-3******",
//     borrowerPhone: user?.phone || "010-8674-7678",
//     guarantor: "김보증 (주민등록번호: 010120-3******, 주소: 충남 천안시 서북구)"
//   };
  
//   const handleClose = () => {
//     // 팝업을 닫고 이전 단계로 돌아가기
//     window.history.back();
//   };
  
//   const handleSign = () => {
//     setCurrentSigner('borrower');
//     setShowSignatureModal(true);
//   };

//   const handleLenderSign = () => {
//     setCurrentSigner('lender');
//     setShowSignatureModal(true);
//   };
  
//   const handleConfirm = () => {
//     console.log('Confirm loan contract');
//   };

//   const handleDocumentClick = () => {
//     setShowDetailedContract(true);
//   };

//   const handleCloseDetailed = () => {
//     setShowDetailedContract(false);
//   };

//   const handleSaveSignature = (signatureData) => {
//     setSignatures(prev => ({
//       ...prev,
//       [currentSigner]: signatureData
//     }));
//   };
//      // 대출 요청 생성
//   const handleSendLoan = async () => {
//     try {

//       await createLoan(loanData);

//       alert('대출 요청이 생성되었습니다.');
//       // setCurrentStep(4); // 완료 단계로 이동
//     } catch (error) {
//       console.error('대출 생성 실패:', error);
//       alert('대출 생성 실패: ' + (error?.response?.data?.message || error.message));
//     }
//   };

//   return (
//     <>
//       {showDetailedContract ? (
//         <DetailedContract 
//           contractData={contractData} 
//           onClose={handleCloseDetailed}
//           signatures={signatures}
//         />
//       ) : (
//         <div className="flex items-center justify-center min-h-screen p-4 font-sans bg-gray-500 bg-opacity-60">
//           {/* Modal Container */}
//           <div className="relative w-full max-w-lg bg-white shadow-2xl rounded-2xl">
//             {/* Close Button */}
//             <button 
//               onClick={handleClose}
//               className="absolute z-10 text-gray-500 top-4 right-4 hover:text-gray-700"
//             >
//               <X className="w-5 h-5" />
//             </button>
            
//             {/* Header */}
//             <div className="px-6 pt-5 pb-4">
//               <div className="flex items-center gap-2">
//                 <div className="w-3 h-3 transform rotate-45 bg-black"></div>
//                 <h1 className="text-base font-semibold text-gray-900">깐부대출</h1>
//               </div>
//             </div>
            
//             {/* Document Preview Section */}
//             <div className="px-6 pb-2">
//               <div className="relative p-4 mb-4 rounded-lg bg-gray-50">
//                 {/* Document Icon with Blue Stamp */}
//                 <div className="flex justify-center mb-4">
//                   <div className="relative cursor-pointer" onClick={handleDocumentClick}>
//                     {/* White document paper */}
//                     <div className="flex flex-col justify-between w-24 h-32 p-2 bg-white border border-gray-200 rounded-sm shadow-sm">
//                       {/* Top text lines */}
//                       <div className="space-y-1">
//                         <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
//                         <div className="h-0.5 bg-gray-300 rounded w-full"></div>
//                         <div className="h-0.5 bg-gray-300 rounded w-1/2"></div>
//                         <div className="h-0.5 bg-gray-300 rounded w-2/3"></div>
//                       </div>
//                       {/* Bottom text lines */}
//                       <div className="space-y-1">
//                         <div className="h-0.5 bg-gray-300 rounded w-2/3"></div>
//                         <div className="h-0.5 bg-gray-300 rounded w-full"></div>
//                         <div className="h-0.5 bg-gray-300 rounded w-3/4"></div>
//                       </div>
//                     </div>
//                     {/* Blue circular stamp with document icon */}
//                     <div className="absolute transform -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2">
//                       <div className="flex items-center justify-center w-10 h-10 bg-blue-500 rounded-full">
//                         <FileText className="w-5 h-5 text-white" />
//                       </div>
//                     </div>
//                     {/* Signature line - positioned at bottom right of document */}
//                     <div className="absolute font-serif text-xs italic text-gray-400 bottom-1 right-1">
//                       {signatures.lender ? (
//                         <img src={signatures.lender} alt="서명" className="h-4" />
//                       ) : (
//                         "김기용"
//                       )}
//                     </div>
//                   </div>
//                 </div>
//               </div>
              
//               {/* Contract Details */}
//               <div className="space-y-4">
//                 {/* Parties Information */}
//                 <div className="grid grid-cols-2 gap-4">
//                   {/* Creditor (갑) */}
//                   <div className="space-y-2">
//                     <h3 className="text-sm font-medium text-gray-900">(갑)채권자</h3>
//                     <div className="space-y-1.5 text-xs">
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">주소</span>
//                         <span className="font-medium text-right text-gray-900">김기용</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">주민등록번호</span>
//                         <span className="text-right text-gray-900">충남 천안시 서북구</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">연락처</span>
//                         <span className="text-right text-gray-900">010120-3******</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600"></span>
//                         <span className="text-right text-gray-900">010-8674-7678</span>
//                       </div>
//                     </div>
//                   </div>
                  
//                   {/* Debtor (을) */}
//                   <div className="space-y-2">
//                     <h3 className="text-sm font-medium text-gray-900">(을)채무자</h3>
//                     <div className="space-y-1.5 text-xs">
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">주소</span>
//                         <span className="font-medium text-right text-gray-900">김나무</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">주민등록번호</span>
//                         <span className="text-right text-gray-900">충남 천안시 서북구</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600">연락처</span>
//                         <span className="text-right text-gray-900">010120-3******</span>
//                       </div>
//                       <div className="flex justify-between">
//                         <span className="text-gray-600"></span>
//                         <span className="text-right text-gray-900">010-8674-7678</span>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
                
//                 {/* Loan Terms */}
//                 <div className="space-y-2">
//                   <div className="grid grid-cols-2 text-xs gap-x-4 gap-y-2">
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">계약 날짜</span>
//                       <span className="font-medium text-gray-900">2025년 5월 13일</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">대출 금액</span>
//                       <span className="font-medium text-gray-900">50,000,000원</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">이자율</span>
//                       <span className="font-medium text-gray-900">연3.2%</span>
//                     </div>
//                     <div className="flex justify-between">
//                       <span className="text-gray-600">변제 방법</span>
//                       <span className="font-medium text-gray-900">계약이체</span>
//                     </div>
//                   </div>
//                 </div>
                
//                 {/* Action Buttons */}
//                 <div className="flex justify-center gap-2 pt-2">
//                   <button 
//                     onClick={handleLenderSign}
//                     className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
//                   >
//                     <PenTool className="w-4 h-4" />
//                     채권자 서명
//                   </button>
//                   <button 
//                     onClick={handleSign}
//                     className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-sm"
//                   >
//                     <PenTool className="w-4 h-4" />
//                     채무자 서명
//                   </button>
//                 </div>
                
//                 {/* Legal Notice */}
//                 <div className="px-2 py-2 text-xs text-center text-gray-500">
//                   본 계약은 상기 조건에 따라 대출이 적용될 수 있습니다. 모든 사항<br />
//                   관련 법적 절차 기준으로 하였습니다.
//                 </div>
                
//                 {/* Main Action Button */}
//                 <div className="pt-2 pb-4">
//                   <button 
//                     onClick={handleSendLoan}
//                     className="w-full py-3 text-sm font-medium text-white transition-colors bg-blue-500 hover:bg-blue-600 rounded-xl"
//                   >
//                     대출 요청하기
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Signature Modal */}
//       {showSignatureModal && (
//         <SignatureModal
//           onClose={() => setShowSignatureModal(false)}
//           onSave={handleSaveSignature}
//         />
//       )}
//     </>
//   );
// }