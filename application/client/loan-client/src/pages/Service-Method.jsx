import React from "react";
import { NavLink } from "react-router-dom";

const ServiceMethod = () => {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">서비스 이용 방법</h1>
        <ol className="list-decimal list-inside text-lg text-gray-700 mb-8 space-y-4">
          <li>
            <span className="font-semibold text-blue-600">회원가입 및 로그인</span> <br />
            간단한 회원가입 후, 구글 계정 또는 이메일로 로그인하세요.
          </li>
          <li>
            <span className="font-semibold text-blue-600">지인 초대 및 친구 추가</span> <br />
            대출을 원하는 지인 또는 친구를 플랫폼에 초대하고, 친구로 추가하세요.
          </li>
          <li>
            <span className="font-semibold text-blue-600">대출 요청 및 보증</span> <br />
            대출이 필요한 사용자는 금액, 기간, 이자율을 입력해 요청하고, 친구가 보증할 수 있습니다.
          </li>
          <li>
            <span className="font-semibold text-blue-600">스마트계약 체결</span> <br />
            모든 조건이 합의되면 스마트계약이 자동으로 생성되어 안전하게 체결됩니다.
          </li>
          <li>
            <span className="font-semibold text-blue-600">빠른 송금 및 상환</span> <br />
            계약이 완료되면 24시간 이내에 송금이 이루어지며, 상환도 플랫폼을 통해 간편하게 진행됩니다.
          </li>
        </ol>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <NavLink to="/service-intro" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition text-center">서비스 소개</NavLink>
          <NavLink to="/ensuring-stability" className="bg-gray-100 text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition text-center">안전성 보장</NavLink>
        </div>
      </div>
    </div>
  );
};

export default ServiceMethod;
