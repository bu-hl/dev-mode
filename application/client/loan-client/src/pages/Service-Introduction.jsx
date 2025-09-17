import React from "react";
import { NavLink } from "react-router-dom";

const ServiceIntroduction = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">서비스 소개</h1>
        <p className="text-lg text-gray-600 mb-8 text-center">
          깐부대출은 블록체인 기반의 안전하고 빠른 P2P 대출 플랫폼입니다.<br />
          신용점수와 상관없이 지인의 보증으로 대출이 가능하며, 스마트계약을 통해 24시간 이내 송금이 이루어집니다.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">지인 기반 대출</h2>
            <p className="text-gray-600 mb-3">신용점수와 무관하게 지인의 신뢰로 대출이 가능합니다.</p>
            <NavLink to="/service-method" className="text-blue-500 hover:underline">서비스 방법 보기 →</NavLink>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">스마트계약 & 빠른 송금</h2>
            <p className="text-gray-600 mb-3">스마트계약으로 안전하고 신속하게 자금이 이동합니다.</p>
            <NavLink to="/ensuring-stability" className="text-blue-500 hover:underline">안전성 보장 보기 →</NavLink>
          </div>
        </div>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <NavLink to="/question" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition text-center">자주 묻는 질문</NavLink>
          <NavLink to="/inquiry" className="bg-gray-100 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-center">문의하기</NavLink>
        </div>
      </div>
    </div>
  );
};

export default ServiceIntroduction;
