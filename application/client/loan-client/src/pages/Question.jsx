import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const faqList = [
  {
    question: "깐부대출은 어떤 서비스인가요?",
    answer: "블록체인 기반의 안전하고 빠른 P2P 대출 플랫폼으로, 신용점수와 상관없이 지인의 보증으로 대출이 가능합니다."
  },
  {
    question: "대출은 어떻게 신청하나요?",
    answer: "회원가입 후, 대출 요청 메뉴에서 금액, 기간, 이자율을 입력해 신청할 수 있습니다."
  },
  {
    question: "보증인은 어떻게 추가하나요?",
    answer: "친구 초대 또는 친구 추가 기능을 통해 보증인을 지정할 수 있습니다."
  },
  {
    question: "스마트계약이란 무엇인가요?",
    answer: "대출 조건이 합의되면 자동으로 생성되는 블록체인 기반 계약으로, 안전하게 거래가 이루어집니다."
  },
  {
    question: "상환은 어떻게 하나요?",
    answer: "플랫폼 내 상환 메뉴를 통해 간편하게 상환할 수 있습니다."
  }
];

const Question = () => {
  const [openIndex, setOpenIndex] = useState(null);

  const handleToggle = (idx) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">자주 묻는 질문</h1>
        <ul className="space-y-4 mb-8">
          {faqList.map((faq, idx) => (
            <li key={idx} className="border rounded-lg p-4">
              <button
                className="w-full text-left font-semibold text-lg flex justify-between items-center focus:outline-none"
                onClick={() => handleToggle(idx)}
              >
                {faq.question}
                <span className="ml-2 text-blue-500">{openIndex === idx ? "▲" : "▼"}</span>
              </button>
              {openIndex === idx && (
                <div className="mt-2 text-gray-700 text-base animate-fade-in">
                  {faq.answer}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div className="flex justify-center">
          <NavLink to="/inquiry" className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition text-center">1:1 문의하기</NavLink>
        </div>
      </div>
    </div>
  );
};

export default Question;
