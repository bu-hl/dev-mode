import React from "react";
import { NavLink } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-20">
      <div className="container mx-auto px-4 md:px-8">
        {/* 메인 푸터 섹션 */}
        <div className="py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold mb-4 text-gray-900">깐부 대출</h4>
              <p className="text-sm text-gray-600">안전하고 빠른 P2P 대출 플랫폼</p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">서비스</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><NavLink to="/service-intro" className="hover:text-blue-500 transition-colors duration-200">서비스 소개</NavLink></li>
                <li><NavLink to="/blog" className="hover:text-blue-500 transition-colors duration-200">블로그</NavLink></li>
                <li><NavLink to="/partners" className="hover:text-blue-500 transition-colors duration-200">제휴사</NavLink></li>
                <li><NavLink to="/careers" className="hover:text-blue-500 transition-colors duration-200">채용</NavLink></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">고객센터</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><NavLink to="/inquiry" className="hover:text-blue-500 transition-colors duration-200">문의하기</NavLink></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-gray-900">회사 정보</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><NavLink to="/partners" className="hover:text-blue-500 transition-colors duration-200">제휴사</NavLink></li>
                <li><NavLink to="/privacy" className="hover:text-blue-500 transition-colors duration-200">개인정보처리방침</NavLink></li>
                <li><NavLink to="/terms" className="hover:text-blue-500 transition-colors duration-200">이용약관</NavLink></li>
              </ul>
            </div>
          </div>
        </div>

        {/* 저작권 섹션 */}
        <div className="border-t border-gray-200 py-6">
          <p className="text-sm text-gray-500 text-center">
            © 2025 깐부대출. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 