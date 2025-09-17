import React, { useState } from "react";

const PasswordFind = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("올바른 이메일을 입력하세요.");
      return;
    }
    // 실제로는 API 호출 필요
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">비밀번호 찾기</h2>
        {submitted ? (
          <div className="text-center">
            <p className="text-blue-600 font-semibold mb-4">비밀번호 재설정 링크가 이메일로 전송되었습니다.</p>
            <p className="text-gray-500 text-sm">이메일을 확인해 주세요.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 mb-1">가입한 이메일</label>
              <input
                type="email"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="example@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition"
            >
              비밀번호 찾기
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PasswordFind;
