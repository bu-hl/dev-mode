import React from "react";
import { useNavigate } from "react-router-dom";

const Error = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-4xl mx-auto border border-gray-200 rounded-2xl bg-white p-8 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center w-full">
          <div className="flex items-center justify-center w-28 h-28 bg-blue-50 rounded-full mx-auto mb-8">
            <svg
              className="w-14 h-14 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2">404 에러</h1>
          <p className="text-gray-500 mb-8 text-base">
            요청하신 페이지가 존재하지 않거나, 삭제되었거나, 주소가 잘못 입력되었습니다.
          </p>
          <button
            className="bg-blue-600 text-white px-8 py-3 rounded-full text-base font-semibold hover:bg-blue-700 flex items-center gap-2 transition"
            onClick={() => navigate("/")}
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            메인으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default Error;
