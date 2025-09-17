import React, { useEffect } from "react";
import { NavLink } from "react-router-dom";
import { FaUsers, FaBolt, FaShieldAlt, FaChartLine } from "react-icons/fa";
import { motion } from "framer-motion";
import FAQItem from "../../components/FAQItem";
import Footer from "../../components/Footer";

const ServiceIntro = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const faqItems = [
    {
      question: "간부대출은 어떤 서비스인가요?",
      answer: "간부대출은 블록체인 기술을 활용한 P2P 대출 플랫폼으로, 지인 기반의 안전한 대출 서비스를 제공합니다."
    },
    {
      question: "대출 신청은 어떻게 하나요?",
      answer: "회원가입 후 대시보드에서 대출 신청 버튼을 클릭하여 필요한 정보를 입력하면 됩니다. 심사는 24시간 이내에 완료됩니다."
    },
    {
      question: "수수료는 얼마인가요?",
      answer: "기존 대출 중개 서비스 대비 90% 이상 저렴한 수수료를 제공합니다. 정확한 수수료는 대출 금액과 기간에 따라 다르게 적용됩니다."
    },
    {
      question: "안전한가요?",
      answer: "네, 블록체인 기반의 스마트 컨트랙트를 통해 모든 거래가 투명하게 기록되며, 지인 기반의 보증 시스템으로 안전성을 보장합니다."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-4">서비스 소개</h1>
          <p className="text-xl text-gray-600">깐부대출은 친구 간 대출의 새로운 패러다임을 제시합니다</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">안전한 대출</h2>
            <p className="text-gray-600">
              깐부대출은 친구 간의 대출을 안전하고 투명하게 관리합니다. 
              계약서 작성부터 이자 계산, 상환 관리까지 모든 과정을 체계적으로 지원합니다.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">편리한 관리</h2>
            <p className="text-gray-600">
              대출 현황을 한눈에 확인하고, 상환 일정을 관리할 수 있습니다.
              자동 알림 서비스로 상환일을 놓치지 않도록 도와드립니다.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">신뢰할 수 있는 서비스</h2>
            <p className="text-gray-600">
              깐부대출은 사용자의 개인정보를 철저히 보호하며,
              안전한 거래를 위한 다양한 보안 시스템을 갖추고 있습니다.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Hero Section - 컨테이너 밖으로 이동 */}
      <section className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              블록체인 기반의 안전한 P2P 대출 플랫폼
            </h1>
            <p className="text-xl mb-8">
              신용점수와 상관없이 지인의 보증으로 대출이 가능하며,<br />
              스마트계약을 통해 24시간 이내 송금이 이루어집니다.
            </p>
            <NavLink
              to="/login"
              className="bg-white text-blue-600 px-8 py-3 rounded-full font-semibold hover:bg-blue-50 transition duration-200 inline-block"
            >
              지금 시작하기
            </NavLink>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {/* Features Section */}
        <section className="py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="text-blue-500 mb-4">
                <FaUsers className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">지인 기반 대출</h3>
              <p className="text-gray-600">
                신용점수와 무관하게 지인의 신뢰로 대출이 가능합니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="text-blue-500 mb-4">
                <FaBolt className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">빠른 송금</h3>
              <p className="text-gray-600">
                스마트계약으로 24시간 이내 빠른 송금이 이루어집니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="text-blue-500 mb-4">
                <FaShieldAlt className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">안전한 거래</h3>
              <p className="text-gray-600">
                블록체인과 스마트계약으로 모든 거래가 안전하게 보장됩니다.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="text-blue-500 mb-4">
                <FaChartLine className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">투명한 이자율</h3>
              <p className="text-gray-600">
                시장 상황에 맞는 공정한 이자율로 대출이 가능합니다.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 bg-gray-50 -mx-4 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">이용 방법</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="text-xl font-semibold mb-2">회원가입</h3>
                <p className="text-gray-600">
                  간단한 회원가입 후 구글 계정 또는 이메일로 로그인하세요.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="text-xl font-semibold mb-2">지인 초대</h3>
                <p className="text-gray-600">
                  대출을 원하는 지인을 플랫폼에 초대하고 친구로 추가하세요.
                </p>
              </div>

              <div className="text-center">
                <div className="bg-blue-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="text-xl font-semibold mb-2">대출 신청</h3>
                <p className="text-gray-600">
                  금액, 기간, 이자율을 입력해 대출을 신청하세요.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-6">지금 바로 시작하세요</h2>
            <p className="text-xl text-gray-600 mb-8">
              깐부대출과 함께 안전하고 빠른 대출을 경험해보세요.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <NavLink
                to="/login"
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
              >
                로그인/회원가입
              </NavLink>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <div className="mb-16">
          <motion.h2 
            className="text-2xl font-bold text-center mb-10"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            자주 묻는 질문
          </motion.h2>
          
          <div className="space-y-4 max-w-3xl mx-auto">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <FAQItem
                  question={item.question}
                  answer={item.answer}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ServiceIntro; 