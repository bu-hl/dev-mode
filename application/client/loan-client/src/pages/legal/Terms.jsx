import React from "react";
import { motion } from "framer-motion";
import Footer from "../../components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-8">이용약관</h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제1조 (목적)</h2>
              <p className="text-gray-600">
                본 약관은 깐부대출(이하 "회사")이 제공하는 서비스의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제2조 (정의)</h2>
              <p className="text-gray-600">
                1. "서비스"란 회사가 제공하는 P2P 대출 중개 플랫폼을 말합니다.<br />
                2. "회원"이란 회사와 서비스 이용계약을 체결한 자를 말합니다.<br />
                3. "대출자"란 서비스를 통해 대출을 받는 회원을 말합니다.<br />
                4. "투자자"란 서비스를 통해 대출을 제공하는 회원을 말합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제3조 (서비스의 내용)</h2>
              <p className="text-gray-600">
                1. 회사는 대출자와 투자자 간의 대출 중개 서비스를 제공합니다.<br />
                2. 회사는 대출 계약의 체결, 이자 지급, 원금 상환 등 대출 관련 업무를 처리합니다.<br />
                3. 회사는 회원에게 대출 관련 정보를 제공합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제4조 (서비스 이용)</h2>
              <p className="text-gray-600">
                1. 서비스 이용은 회사의 업무상 또는 기술상 특별한 지장이 없는 한 연중무휴, 1일 24시간을 원칙으로 합니다.<br />
                2. 회사는 시스템 정기점검, 증설 및 교체를 위해 서비스를 일시 중단할 수 있으며, 예정된 작업으로 인한 서비스 일시 중단은 서비스 홈페이지를 통해 사전에 공지합니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제5조 (회원의 의무)</h2>
              <p className="text-gray-600">
                1. 회원은 관계법령, 본 약관의 규정, 이용안내 등 회사가 통지하는 사항을 준수하여야 합니다.<br />
                2. 회원은 회사의 명예를 훼손하거나 업무를 방해하는 행위를 하여서는 안 됩니다.<br />
                3. 회원은 회사가 제공하는 서비스를 이용하여 얻은 정보를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안 됩니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제6조 (책임제한)</h2>
              <p className="text-gray-600">
                1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적인 사유로 인한 서비스 중단에 대하여 책임을 지지 않습니다.<br />
                2. 회사는 서비스 이용과 관련하여 회원에게 발생한 손해 중 회원의 고의, 과실에 의한 손해에 대하여 책임을 지지 않습니다.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">제7조 (약관의 변경)</h2>
              <p className="text-gray-600">
                1. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.<br />
                2. 회원은 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단할 수 있으며, 계속 서비스를 이용하는 경우 변경된 약관에 동의한 것으로 간주됩니다.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms; 