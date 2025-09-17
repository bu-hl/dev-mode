import React, { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import ReCAPTCHA from "react-google-recaptcha";
import { motion } from 'framer-motion';
import Header from '../../components/Header';
import Footer from "../../components/Footer";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

const Inquiry = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaRef = useRef(null);

  useEffect(() => {
    // 로그인된 유저 정보 자동 입력
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setForm((prev) => ({
          ...prev,
          name: user.user_metadata?.full_name || user.user_metadata?.name || "",
          email: user.email || ""
        }));
      }
    };
    getUser();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // 입력이 변경될 때마다 에러 메시지 초기화
  };

  // 메시지 길이 체크 함수
  const checkMessageLength = (text) => {
    return text.trim().length >= 20;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      // 메시지 길이 체크
      if (!checkMessageLength(form.message)) {
        setError("문의 내용은 20자 이상 입력해주세요.");
        return;
      }

      // reCAPTCHA 검증
      const captchaToken = await recaptchaRef.current.executeAsync();
      if (!captchaToken) {
        setError("캡챠 인증이 필요합니다.");
        return;
      }

      // 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('로그인이 필요합니다.');
      }

      // 백엔드 API 호출
      const response = await fetch('http://localhost:8001/api/inquiry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...form,
          captchaToken
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || '문의 접수 중 오류가 발생했습니다.');
      }

      setSubmitted(true);
    } catch (err) {
      console.error('문의하기 에러:', err);
      if (err.message === '로그인이 필요합니다.') {
        setError('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      } else {
        setError(err.message || "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-4">문의하기</h1>
            <p className="text-xl text-gray-600">궁금한 점이 있으시다면 언제든 문의해 주세요</p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onSubmit={handleSubmit}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  문의내용
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  문의하기
                </button>
              </div>
            </div>
          </motion.form>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Inquiry;
