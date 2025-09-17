import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { createClient } from "@supabase/supabase-js";
import { motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import Header from "../../components/Header";

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState({
    type: 'success',
    title: '',
    message: ''
  });
  const [timerProgress, setTimerProgress] = useState(100);

  const showNotification = (type, title, message) => {
    setModalContent({ type, title, message });
    setShowModal(true);
    setTimerProgress(100);

    const duration = 3000;
    const interval = 30;
    const steps = duration / interval;
    const decrement = 100 / steps;

    const timer = setInterval(() => {
      setTimerProgress(prev => {
        if (prev <= 0) {
          clearInterval(timer);
          setShowModal(false);
          return 0;
        }
        return prev - decrement;
      });
    }, interval);
  };

  const closeModal = () => {
    setShowModal(false);
    setTimerProgress(0);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await signIn(formData.email, formData.password);
      if (error) throw error;
      navigate("/");
    } catch (error) {
      let errorMessage = '로그인 중 오류가 발생했습니다.';
      if (error.message === 'Invalid login credentials') {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
      }
      showNotification('error', '로그인 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await signInWithGoogle();
      if (error) throw error;
    } catch (error) {
      let errorMessage = '구글 로그인 중 오류가 발생했습니다.';
      if (error.message.includes('popup_closed_by_user')) {
        errorMessage = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
      } else if (error.message.includes('cancelled')) {
        errorMessage = '로그인이 취소되었습니다.';
      }
      showNotification('error', '구글 로그인 실패', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const bgColor = modalContent.type === 'success' ? 'bg-green-50' : 'bg-red-50';
  const textColor = modalContent.type === 'success' ? 'text-green-800' : 'text-red-800';
  const Icon = modalContent.type === 'success' ? CheckCircleIcon : ExclamationCircleIcon;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="bg-white min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center scale-105">
          <h1 className="text-3xl font-bold mb-3">깐부대출에 오신걸 환영합니다.</h1>
          <p className="text-base text-gray-500 mb-7">블록체인 기반 대출 시스템</p>

          <button
            className="w-full bg-gray-100 border border-gray-300 rounded-full py-3 mb-7 flex items-center justify-center hover:bg-gray-200 text-lg disabled:opacity-50"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-6 h-6 mr-2" viewBox="0 0 533.5 544.3">
              <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.4-34.3-4.1-50.6H272v95.8h146.9c-6.3 33.9-25 62.6-53.4 81.9v68.1h86.4c50.5-46.5 81.6-115.2 81.6-195.2z"/>
              <path fill="#34a853" d="M272 544.3c72.6 0 133.5-24 178-65.1l-86.4-68.1c-23.9 16.1-54.6 25.5-91.6 25.5-70.5 0-130.2-47.6-151.5-111.6h-89.3v69.9c44.5 88.3 135.9 149.4 240.8 149.4z"/>
              <path fill="#fbbc04" d="M120.5 324.9c-10.3-30.2-10.3-62.6 0-92.8v-69.9h-89.3c-39.2 77.8-39.2 169.9 0 247.7l89.3-69.9z"/>
              <path fill="#ea4335" d="M272 107.7c39.6 0 75.1 13.6 103.1 40.3l77.2-77.2c-48.4-44.9-112.5-70.8-180.3-70.8-104.9 0-196.3 61.1-240.8 149.4l89.3 69.9c21.3-64 81-111.6 151.5-111.6z"/>
            </svg>
            {loading ? "로그인 중..." : "구글로 계속하기"}
          </button>

          <form className="space-y-5" onSubmit={handleEmailLogin}>
            <div className="text-left">
              <label className="block text-base font-medium mb-1">Email</label>
              <input
                type="email"
                placeholder="Email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-5 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                required
              />
            </div>
            <div className="text-left">
              <label className="block text-base font-medium mb-1">Password</label>
              <input
                type="password"
                placeholder="Password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-5 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 text-base"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-full text-base hover:bg-blue-600 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>
          </form>

          <p className="text-base mt-5">
            계정이 없으신가요?{' '}
            <NavLink to="/signup" className="text-blue-500 hover:underline">회원가입하기</NavLink>
          </p>
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
                <div className={`${bgColor} px-4 pt-5 pb-4 sm:p-6 sm:pb-4`}>
                  <div className="sm:flex sm:items-start">
                    <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${modalContent.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Icon className={`h-6 w-6 ${modalContent.type === 'success' ? 'text-green-600' : 'text-red-600'}`} aria-hidden="true" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className={`text-lg font-medium leading-6 ${textColor}`}>{modalContent.title}</h3>
                      <div className="mt-2">
                        <p className={`text-sm ${textColor}`}>{modalContent.message}</p>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 pt-4 pr-4">
                      <button
                        type="button"
                        className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={closeModal}
                      >
                        <span className="sr-only">Close</span>
                        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="h-1 bg-gray-200">
                    <div
                      className={`h-1 ${modalContent.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}
                      style={{ width: `${timerProgress}%`, transition: 'width 30ms linear' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
