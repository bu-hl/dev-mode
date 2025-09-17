import React from "react";
import { NavLink } from "react-router-dom";

const EnsuringStability = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">안전성 보장</h1>
        <p className="text-lg text-gray-700 mb-8 text-center">
          깐부대출은 블록체인과 스마트계약 기술을 활용하여<br />
          모든 거래의 투명성과 안전성을 보장합니다.
        </p>
        <ul className="list-disc list-inside text-lg text-gray-700 mb-8 space-y-4">
          <li>
            <span className="font-semibold text-blue-600">블록체인 기반 거래</span> <br />
            모든 대출 및 상환 내역이 블록체인에 기록되어 위변조가 불가능합니다.
          </li>
          <li>
            <span className="font-semibold text-blue-600">스마트계약 자동 실행</span> <br />
            대출 조건이 충족되면 스마트계약이 자동으로 실행되어 신뢰할 수 있습니다.
          </li>
          <li>
            <span className="font-semibold text-blue-600">개인정보 보호</span> <br />
            민감한 정보는 암호화되어 안전하게 보호됩니다.
          </li>
          <li>
            <span className="font-semibold text-blue-600">실시간 모니터링</span> <br />
            모든 거래는 실시간으로 모니터링되어 이상 거래를 즉시 감지합니다.
          </li>
        </ul>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <NavLink to="/service-intro" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition text-center">서비스 소개</NavLink>
          <NavLink to="/service-method" className="bg-gray-100 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-center">서비스 방법</NavLink>
        </div>
      </div>
    </div>
  );
};

export default EnsuringStability;
