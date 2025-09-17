import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { FaUsers, FaBolt } from "react-icons/fa";
import mrbannerImage from "../../assets/mrbanner.png";
import mlbannerImage from "../../assets/mlbanner.png";
import Footer from "../../components/Footer";

const Main = () => {
  const [loanAmount, setLoanAmount] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative text-white py-24 bg-[url('https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&h=600')] bg-cover bg-center">
        <div className="absolute inset-0 bg-black opacity-70"></div>
        <div className="relative container mx-auto px-4 md:px-8 py-8 z-10">
          <div className="max-w-2xl mx-auto text-left">
            <h1 className="text-4xl font-bold mb-12 pl-4">투자 기회를 놓치지 마세요!</h1>

            <div className="flex flex-col md:flex-row space-y-3 md:space-y-0">
              <input
                type="text"
                placeholder="원하는 대출 금액을 입력하세요"
                className="flex-1 px-4 py-3 text-gray-800 border-none outline-none rounded-md md:rounded-r-none"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
              />
              <NavLink to="/dashboard">
                <button className="bg-blue-500 text-white px-6 py-3 rounded-md md:rounded-l-none whitespace-nowrap font-medium">
                  즉시 대출 신청
                </button>
              </NavLink>
              
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="py-12 container mx-auto px-4 md:px-8">
        <div>
          <h2 className="text-3xl font-bold mb-2">제도권 금융의 한계를 넘어서세요</h2>
          <p className="text-gray-600 mb-6">까다로운 심사 없이 자영업자, 프리랜서, 투잡자, 학생도 간편하게 자금을 확보하세요</p>

          <button className="bg-blue-500 text-white px-5 py-2 rounded-full text-sm font-medium">
            대출 신청하기
          </button>
        </div>
      </section>

      {/* Features Cards Section */}
      <section className="pt-12 pb-6 container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="text-blue-500 mr-4">
                <FaUsers className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium">지인 기반 대출 시스템</h3>
                <p className="text-gray-600 text-sm mt-1">신용점수와 상관없이 지인의 보증으로 대출이 가능합니다</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-lg">
            <div className="flex items-start">
              <div className="text-blue-500 mr-4">
                <FaBolt className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium">빠른 심사와 송금</h3>
                <p className="text-gray-600 text-sm mt-1">스마트계약으로 24시간 이내 빠른 송금</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile and People Images */}
      <section className="py-10 container mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img
              src={mlbannerImage}
              alt="모바일앱 인터페이스"
              className="w-full rounded-lg mb-2"
            />
            <p className="text-slate-500 font-medium">모바일로 간편하게 투자 자금 확보</p>
          </div>

          <div>
            <img
              src={mrbannerImage}
              alt="계약 일러스트"
              className="w-full rounded-lg mb-2"
            />
            <p className="text-slate-500 font-medium">계약 중개 수수료 90% 이상 절감</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default Main;
