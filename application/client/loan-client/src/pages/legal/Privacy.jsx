import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import Footer from "../../components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-8">개인정보처리방침</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-8">
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. 수집하는 개인정보 항목</h2>
              <p className="text-gray-600 mb-2">깐부대출은 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>이름, 생년월일, 성별</li>
                <li>연락처 (휴대폰 번호, 이메일)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. 개인정보의 수집 및 이용목적</h2>
              <p className="text-gray-600 mb-2">수집된 개인정보는 다음의 목적을 위해 이용됩니다:</p>
              <ul className="list-disc pl-6 text-gray-600">
                <li>회원 관리 및 서비스 제공</li>
                <li>대출 심사 및 계약 체결</li>
                <li>상환 관리 및 채권 추심</li>
                <li>고객 문의 및 불만 처리</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. 개인정보의 보유 및 이용기간</h2>
              <p className="text-gray-600">
                회원의 개인정보는 원칙적으로 개인정보의 수집 및 이용목적이 달성되면 지체 없이 파기합니다. 
                단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. 개인정보의 파기절차 및 방법</h2>
              <p className="text-gray-600">
                회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 
                파기절차 및 방법은 다음과 같습니다:
              </p>
              <ul className="list-disc pl-6 text-gray-600 mt-2">
                <li>파기절차: 회원이 서비스 가입 등을 위해 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.</li>
                <li>파기방법: 전자적 파일 형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">5. 개인정보 보호책임자</h2>
              <p className="text-gray-600">
                회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <p className="text-gray-600">개인정보 보호책임자: 김깐부</p>
                <p className="text-gray-600">연락처: privacy@kkangbu.com</p>
              </div>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Privacy; 