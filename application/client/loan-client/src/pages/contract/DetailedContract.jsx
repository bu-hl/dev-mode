import { useState, useRef, useEffect } from "react";
import { X, Download } from "lucide-react";
import html2canvas from "html2canvas";

// Detailed Contract Component
export default function DetailedContract({ contractData, onClose, signatures,
    showActions = true  // ★ 기본값을 true로 두고, off‐screen 캡처할 때 false로 넘겨줄 예정
 }) {
  const contractRef = useRef(null);

  const handleDownload = async () => {
    if (contractRef.current) {
      try {
        const canvas = await html2canvas(contractRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff"
        });
        
        canvas.toBlob((blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `대출계약서_${contractData.lenderName}_${contractData.borrowerName}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        }, 'image/png');
      } catch (error) {
        console.error('Error generating image:', error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ----- 헤더 (버튼 영역) ----- */}
      {showActions && (
        <div className="sticky top-0 z-10 bg-white border-b">
          <div className="flex items-center justify-between max-w-4xl px-8 py-4 mx-auto">
            <h1 className="text-xl font-bold">대출 계약서</h1>
            <div className="flex items-center gap-4">
              {/* 이미지 다운로드 버튼 */}
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-colors bg-blue-500 rounded-lg hover:bg-blue-600"
              >
                <Download className="w-4 h-4" />
                이미지 다운로드
              </button>
              {/* 닫기 버튼 */}
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <X className="w-4 h-4" />
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contract Content */}
      <div ref={contractRef} className="max-w-4xl p-8 mx-auto bg-white">
        <h1 className="mb-8 text-2xl font-bold text-center">대차(대출) 계약서</h1>
        
        <div className="space-y-6 text-sm">
          <section>
            <h2 className="mb-2 text-lg font-semibold">제1조(목적)</h2>
            <p className="leading-relaxed">
              본 계약은 채권자(갑)와 채무자(을) 간에 금전 대차 관계를 설정하고, 그에 따른 권리·의무 및 상환 방법 등을 규정함을 목적으로 한다.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제2조(용어의 정의)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>"대출금"이라 함은 본 계약에 따라 채권자(갑)가 채무자(을)에게 지급하는 금전을 말한다.</li>
              <li>"이자율"이라 함은 연 단위 이자율을 의미하며, 본 계약 제3조에 정한 바에 따른다.</li>
              <li>"연체이자율"이라 함은 채무자가 본 계약상의 상환기한을 초과할 경우 적용되는 가산 이자율을 말한다.</li>
              <li>"상환"이라 함은 대출금 및 이자를 계약상 정해진 날짜까지 채무자가 채권자에게 지급하는 것을 말한다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제3조(대출 금액 및 이자율)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>채권자(갑)는 채무자(을)에게 금 {contractData.amount}원(￦{contractData.amount})을 대출하기로 한다.</li>
              <li>대출금에 대한 연 이자율은 {contractData.interestRate}%로 한다.</li>
              <li>이자는 "대출 실행일"부터 "상환 완료일"까지 일수로 계산하며, 1년은 365일로 본다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제4조(상환 기한 및 방법)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>채무자(을)는 대출 실행일로부터 {contractData.durationMonths}개월 이내에 대출원금과 이자를 전액 상환하여야 한다.</li>
              <li>상환 방법은 아래 중 하나를 따른다.
                <ol className="pl-5 mt-2 list-decimal">
                  <li>일시상환: 만기일(대출 실행일로부터 {contractData.durationMonths}개월)까지 원금과 이자를 일시에 상환한다.</li>
                  <li>분할상환: 매 {contractData.durationMonths/2}개월마다 원금을 균등 분할하여 납부하고, 이자는 매 회 분할상환일에 함께 납부한다.</li>
                </ol>
              </li>
              <li>상환은 "{contractData.bankAccount}" 계좌로 이체함을 원칙으로 한다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제5조(연체 이자 및 연체 시 조치)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>채무자(을)가 상환기한을 초과하여 상환하지 않을 경우, 초과일수에 대하여 연 {contractData.interestRate * 1.5}%의 연체이자가 추가로 부과된다.</li>
              <li>채무자(을)는 연체 발생일로부터 발생한 모든 연체이자를 즉시 추가 상환해야 하며, 미납 시 채권자(갑)는 즉시 법적 조치를 취할 수 있다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제6조(중도상환 및 수수료)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>채무자(을)는 약정 상환기한 이전에 대출금 전액 또는 일부를 중도상환할 수 있다.</li>
              <li>중도상환 시에는 잔여원금의 1%에 해당하는 금액을 중도상환 수수료로 지급해야 한다.</li>
              <li>채무자가 중도상환하려는 경우, 최소 7일 이전에 채권자(갑)에게 사전 통보해야 한다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제7조(계약 해제·해지)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>채무자(을)가 아래 각 호의 어느 하나에 해당할 때, 채권자(갑)는 즉시 본 계약을 해지할 수 있다.
                <ol className="pl-5 mt-2 list-decimal">
                  <li>본 계약상의 채무를 30일 이상 연체한 경우</li>
                  <li>본 계약과 관련하여 중대한 허위 사실을 고지한 경우</li>
                  <li>그 밖에 채권자가 계약을 계속 유지하기 어려운 중대한 사유가 발생한 경우</li>
                </ol>
              </li>
              <li>제1항에 따라 계약이 해지된 경우, 채무자(을)는 해지 통보일로부터 7일 이내에 잔여 원금 및 이자를 즉시 상환하여야 하며, 미상환 시 채권자(갑)는 법적 절차를 진행할 수 있다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제8조(보증인 및 담보)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>본 대출을 보증하기 위하여 "{contractData.guarantor}"를 보증인으로 지정한다.</li>
              <li>보증인은 채무자(을)가 본 계약상의 의무를 이행하지 않을 경우, 채권자(갑)가 직접 보증인에게 대출금·이자를 청구할 수 있다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">제9조(기타 약정사항)</h2>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>본 계약에 명시되지 않은 사항은 민법·상법 및 기타 관계 법령의 규정에 따른다.</li>
              <li>본 계약의 일부 조항이 무효로 되더라도, 그 밖의 조항은 여전히 유효하며 효력을 가진다.</li>
              <li>본 계약과 관련하여 분쟁이 발생할 경우 채권자(갑) 주소지를 관할하는 법원을 제1심 합의 관할 법원으로 한다.</li>
            </ol>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-semibold">제10조(인감 및 서명)</h2>
            <p className="mb-6">채권자(갑) 및 채무자(을)는 본 계약서를 충분히 검토·숙지하였으며, 상기 기재된 모든 조항에 동의함을 확인하고 서명 또는 전자서명을 날인한다.</p>
            
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="mb-4 font-semibold">채권자(갑)</h3>
                <div className="space-y-2">
                  <p>이름: {contractData.lenderName}</p>
                  <p>주민등록번호: {contractData.lenderSSN}</p>
                  <p>연락처: {contractData.lenderPhone}</p>
                  <p>주소: {contractData.lenderAddress}</p>

                  <div className="pt-4 mt-4 border-t">
                    {signatures.lender ? (
                      <img src={signatures.lender} alt="채권자 서명" className="max-h-20" />
                    ) : (
                      <p className="text-center text-gray-400">(서명)</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="mb-4 font-semibold">채무자(을)</h3>
                <div className="space-y-2">
                  <p>이름: {contractData.borrowerName}</p>
                  <p>주민등록번호: {contractData.borrowerSSN}</p>
                  <p>연락처: {contractData.borrowerPhone}</p>
                  <p>주소: {contractData.borrowerAddress}</p>
                  <div className="pt-4 mt-4 border-t">
                    {signatures.borrower ? (
                      <img src={signatures.borrower} alt="채무자 서명" className="max-h-20" />
                    ) : (
                      <p className="text-center text-gray-400">(서명)</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
