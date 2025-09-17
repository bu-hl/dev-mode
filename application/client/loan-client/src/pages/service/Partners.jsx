import React from 'react';
import { motion } from 'framer-motion';
import Footer from "../../components/Footer";
import tossLogo from "../../assets/toss.png";
import kakaopayLogo from "../../assets/kakaopay.png";
import shcLogo from "../../assets/shc.png";

const Partners = () => {
  const partners = [
    {
      id: 1,
      name: "신한은행",
      logo: shcLogo,
      description: "국내 최고의 금융 서비스와 함께하는 신한은행과의 제휴를 준비 중입니다.",
      category: "은행",
      expectedDate: "2026년 하반기"
    },
    {
      id: 2,
      name: "카카오페이",
      logo: kakaopayLogo,
      description: "편리한 결제 서비스로 유명한 카카오페이와의 제휴를 준비 중입니다.",
      category: "결제",
      expectedDate: "2026년 하반기"
    },
    {
      id: 3,
      name: "토스",
      logo: tossLogo,
      description: "혁신적인 금융 서비스를 제공하는 토스와의 제휴를 준비 중입니다.",
      category: "핀테크",
      expectedDate: "2026년 하반기"
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
          <h1 className="text-4xl font-bold text-gray-900 mb-4">제휴사 소개</h1>
          <p className="text-xl text-gray-600">깐부대출과 함께할 파트너사를 소개합니다</p>
        </motion.div>

        <div className="space-y-8">
          {partners.map((partner, index) => (
            <motion.div
              key={partner.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                  <div className="w-40 h-40 flex-shrink-0 bg-white rounded-lg p-4 flex items-center justify-center">
                    <div className="w-full h-full relative">
                      <img
                        src={partner.logo}
                        alt={partner.name}
                        className="w-full h-full object-contain"
                        style={{
                          objectFit: 'contain',
                          maxWidth: '100%',
                          maxHeight: '100%',
                          width: 'auto',
                          height: 'auto'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">{partner.name}</h2>
                        <span className="inline-block px-4 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-full">
                          {partner.category}
                        </span>
                      </div>
                      <div className="mt-4 md:mt-0 flex items-center text-sm text-gray-500">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>제휴 예정일: {partner.expectedDate}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 mb-6">{partner.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm">
                          제휴 준비 중
                        </span>
                      </div>
                      <button className="text-blue-600 font-medium hover:text-blue-800 transition-colors duration-200">
                        자세히 보기 →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 text-center"
        >
          <p className="text-gray-600">
            깐부대출은 더 나은 서비스를 위해 다양한 파트너사와의 제휴를 준비하고 있습니다.
            <br />
            제휴 문의는 <a href="/inquiry" className="text-blue-600 hover:text-blue-800">문의하기</a>를 통해 가능합니다.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Partners; 