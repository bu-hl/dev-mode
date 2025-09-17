import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createWallet, getWalletBalance } from '../services/api';
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import SignaturePad from 'react-signature-canvas';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// 이메일 확인 함수
const checkEmailProvider = async (email) => {
  try {
    const response = await axios.post('http://localhost:8001/check-email', 
      { email },
      {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('이메일 확인 API 호출 실패:', error);
    throw error;
  }
};

const Signup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [emailChecked, setEmailChecked] = useState(false);
  const [emailInfo, setEmailInfo] = useState(null);
  const [isEmailAvailable, setIsEmailAvailable] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    address: '',
    detailAddress: '',
    birthDate: '',
    gender: '',
    terms: false
  });

  const [errors, setErrors] = useState({});
  const signaturePadRef = useRef(null);
  const [signatureData, setSignatureData] = useState(null);

  // 구글 로그인으로부터 전달받은 정보 처리
  useEffect(() => {
    const initializeFormData = async () => {
      try {
        // 현재 로그인된 사용자 정보 가져오기
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          console.log('현재 로그인된 사용자:', session.user);
          setIsGoogleUser(true);

          // 이미 DB에 프로필이 존재하는지 확인
          const { data: existingProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', session.user.id)
            .single();

          if (profileError && profileError.code !== 'PGRST116') {
            throw profileError;
          }

          if (existingProfile) {
            // 이미 가입된 사용자: 추가 입력 없이 메인 페이지로 이동
            navigate('/');
            return;
          }

          // 프로필 없으면 → 폼 초기값 설정 후 Step1부터 시작
          setFormData(prev => ({
            ...prev,
            email: session.user.email,
            phone: session.user.user_metadata?.phone || '',
            address: session.user.user_metadata?.address || '',
            birthDate: session.user.user_metadata?.birthdate || '',
            gender: session.user.user_metadata?.gender || '',
            terms: session.user.user_metadata?.terms || false
          }));
          // 구글 사용자는 Step1부터 시작
          setCurrentStep(1);
        }
      } catch (error) {
        console.error('사용자 정보 초기화 에러:', error);
      }
    };

    initializeFormData();
  }, []);

  // 이메일 확인 처리
  const handleEmailCheck = async () => {
    try {
      if (!formData.email) {
        setErrors({ email: '이메일을 입력해주세요' });
        setIsEmailAvailable(false);
        return;
      }

      // 이메일 형식 검사
      if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        setErrors({ email: '올바른 이메일 형식이 아닙니다' });
        setIsEmailAvailable(false);
        return;
      }

      // 이메일 도메인 추출 및 소문자 변환
      const emailDomain = formData.email.split('@')[1].toLowerCase();
      
      // 이메일 중복 체크 시 도메인 대소문자 구분 없이 처리
      const normalizedEmail = formData.email.split('@')[0] + '@' + emailDomain;
      
      const result = await checkEmailProvider(normalizedEmail);
      setEmailInfo(result);
      setEmailChecked(true);
      
      if (result.exists) {
        if (result.provider === 'google') {
          setErrors({ email: '이 이메일은 Google로 가입된 계정입니다.' });
        } else {
          setErrors({ email: '이미 가입된 이메일입니다.' });
        }
        setIsEmailAvailable(false);
      } else {
        setErrors({}); // 에러 메시지 초기화
        setIsEmailAvailable(true);
      }
    } catch (error) {
      console.error('이메일 확인 실패:', error);
      setErrors({ email: '이메일 확인 중 오류가 발생했습니다.' });
      setIsEmailAvailable(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 이메일이 변경되면 이메일 확인 상태 초기화
    if (name === 'email') {
      setEmailChecked(false);
      setEmailInfo(null);
      setIsEmailAvailable(false);
    }
  };

  // 생년월일 유효성 검사 함수
  const validateBirthDate = (birthDate) => {
    if (!birthDate) return false;
    
    const [year, month, day] = birthDate.split('-').map(Number);
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const minYear = currentYear - 100; // 최소 연도 (현재 연도 - 100년)
    
    // 연도 검사
    if (year < minYear || year > currentYear) {
      return false;
    }
    
    // 월 검사
    if (month < 1 || month > 12) {
      return false;
    }
    
    // 일 검사
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) {
      return false;
    }
    
    return true;
  };

  const handleNext = () => {
    const newErrors = {};

    switch (currentStep) {
      case 1: // 이름과 이메일 입력 단계
        if (!formData.name) {
          newErrors.name = '이름을 입력해주세요';
        }
        if (!isGoogleUser) {
          if (!formData.email) {
            newErrors.email = '이메일을 입력해주세요';
          } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
            newErrors.email = '올바른 이메일 형식이 아닙니다';
          } else if (!emailChecked) {
            newErrors.email = '이메일 확인이 필요합니다';
          } else if (!isEmailAvailable) {
            newErrors.email = '사용할 수 없는 이메일입니다';
          }
        }
        break;

      case 2: // 비밀번호 설정 단계
        if (!isGoogleUser) {
          if (!formData.password) {
            newErrors.password = '비밀번호를 입력해주세요';
          } else if (formData.password.length < 8) {
            newErrors.password = '비밀번호는 8자 이상이어야 합니다';
          }

          if (!formData.confirmPassword) {
            newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
          } else if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
          }
        }
        break;

      case 3: // 생년월일과 성별 단계
        if (!formData.birthDate) {
          newErrors.birthDate = '생년월일을 입력해주세요';
        } else if (!validateBirthDate(formData.birthDate)) {
          newErrors.birthDate = '유효한 생년월일을 입력해주세요';
        }
        if (!formData.gender) {
          newErrors.gender = '성별을 선택해주세요';
        }
        break;

      case 4: // 연락처와 주소 단계
        if (!formData.phone) {
          newErrors.phone = '전화번호를 입력해주세요';
        }
        if (!formData.address) {
          newErrors.address = '주소를 입력해주세요';
        }
        break;
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      if (isGoogleUser && currentStep === 1) {
        // 구글 사용자는 이름 입력 후 바로 생년월일 단계로
        setCurrentStep(3);
      } else {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  // 생년월일 포맷팅 함수 추가
  const formatBirthNumber = (birthDate) => {
    if (!birthDate) return '';
    // YYYY-MM-DD 형식에서 YYMMDD 형식으로 변환
    const [year, month, day] = birthDate.split('-');
    return `${year.slice(2)}${month}${day}`;
  };

  const handleSaveSignature = () => {
    if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
      const svgData = signaturePadRef.current.toDataURL('image/svg+xml');
      setSignatureData(svgData);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // 1. 서명 유효성 검사
    if (!signatureData) {
      alert('서명을 입력해주세요.');
      setLoading(false);
      return;
    }

    let userId;

    try {
      if (!isGoogleUser) {
        // 일반 회원가입
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              name: formData.name,
              birth_number: formatBirthNumber(formData.birthDate),
              gender: formData.gender,
              phone: formData.phone,
              address: formData.address
            }
          }
        });

        if (authError) throw authError;
        userId = authData.user.id;

        // 프로필 바로 생성
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              name: formData.name,
              birth_number: formatBirthNumber(formData.birthDate),
              gender: formData.gender,
              phone: formData.phone,
              address: formData.address,
              email: formData.email
            }
          ]);

        if (profileError) throw profileError;

        // 로그인 처리
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });

        if (signInError) throw signInError;
      } else {
        // 구글 로그인 사용자
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        userId = user.id;

        const { error: profileError } = await supabase
          .from('profiles')
          .upsert([
            {
              id: user.id,
              name: formData.name,
              birth_number: formatBirthNumber(formData.birthDate),
              gender: formData.gender,
              phone: formData.phone,
              address: formData.address,
              email: formData.email
            }
          ], {
            onConflict: 'id'
          });

        if (profileError) throw profileError;
      }

      // 공통: 지갑 생성 요청
      try {
        console.log("지갑 생성 시도:", userId);
        await createWallet(userId);
        console.log("✅ 지갑 생성 완료");
      } catch (walletError) {
        console.error("지갑 자동 생성 실패:", walletError.message || walletError);
      }

      // 2. 서명 SVG 추출
      const svgBase64 = signatureData.replace('data:image/svg+xml;base64,', '');
      // 3. Supabase signatures 테이블에 저장
      await supabase.from('signatures').insert({
        user_id: userId,
        signature_data: svgBase64
      });

      navigate('/');

    } catch (error) {
      console.error('회원가입 에러:', error);
      if (error.message.includes('Email not confirmed')) {
        alert('이메일 확인이 필요합니다. 이메일을 확인해주세요.');
      } else if (error.message.includes('Email address')) {
        alert('유효하지 않은 이메일 주소입니다.');
      } else if (error.code === '42501') {
        alert('권한이 없습니다. 다시 로그인해주세요.');
      } else {
        alert('회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요';
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다';
    }

    if (!formData.phone) {
      newErrors.phone = '전화번호를 입력해주세요';
    }

    if (!formData.address) {
      newErrors.address = '주소를 입력해주세요';
    }

    if (!formData.birthDate) {
      newErrors.birthDate = '생년월일을 입력해주세요';
    }

    if (!formData.gender) {
      newErrors.gender = '성별을 선택해주세요';
    }

    if (!formData.terms) {
      newErrors.terms = '이용약관에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 전화번호 포맷팅 함수 추가
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // 숫자만 추출
    const cleaned = phone.replace(/\D/g, '');
    // 010-0000-0000 형식으로 변환
    const match = cleaned.match(/^(\d{3})(\d{4})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    return phone;
  };

  const renderStep = () => {
    const pageVariants = {
      initial: {
        opacity: 0,
        x: 50,
        scale: 0.95
      },
      animate: {
        opacity: 1,
        x: 0,
        scale: 1,
        transition: {
          duration: 0.5,
          ease: "easeOut"
        }
      },
      exit: {
        opacity: 0,
        x: -50,
        scale: 0.95,
        transition: {
          duration: 0.3,
          ease: "easeIn"
        }
      }
    };

    switch (currentStep) {
      case 1:
        return (
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-8">
              {isGoogleUser ? '이름을 입력해주세요' : '이름과 이메일을 입력해주세요'}
            </h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="이름을 입력하세요"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
              {!isGoogleUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">이메일</label>
                  <div className="mt-1 flex gap-2">
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="flex-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="이메일을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={handleEmailCheck}
                      className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      확인
                    </button>
                  </div>
                  {errors.email && (
                    <p className="mt-2 text-sm text-red-600">{errors.email}</p>
                  )}
                  {emailChecked && !errors.email && isEmailAvailable && (
                    <p className="mt-2 text-sm text-green-600">사용 가능한 이메일입니다.</p>
                  )}
                  {emailChecked && emailInfo?.exists && emailInfo?.provider === 'google' && (
                    <div className="mt-2 p-4 bg-yellow-50 rounded-lg">
                      <p className="text-sm text-yellow-700">
                        이 이메일은 Google로 가입된 계정입니다. Google 로그인을 사용해주세요.
                      </p>
                      <button
                        onClick={() => supabase.auth.signInWithOAuth({ provider: 'google' })}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Google로 로그인
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="mt-8">
              <button
                onClick={handleNext}
                className={`px-8 py-3 rounded-lg font-semibold transition duration-200 ${
                  !isGoogleUser && !isEmailAvailable && emailChecked
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
                disabled={!isGoogleUser && !isEmailAvailable && emailChecked}
              >
                다음
              </button>
            </div>
          </div>
        );

      case 2:
        return !isGoogleUser ? (
          <motion.div
            key="step2"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-8">비밀번호를 설정해주세요</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="비밀번호를 입력하세요"
                />
                {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="비밀번호를 다시 입력하세요"
                />
                {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <button
                onClick={handleNext}
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
              >
                다음
              </button>
            </motion.div>
          </motion.div>
        ) : null;

      case 3:
        return (
          <motion.div
            key="step3"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">생년월일과 성별을 입력해주세요</h2>
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-left text-gray-600 mb-1">생년월일</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                {errors.birthDate && <p className="text-red-500 text-sm mt-1">{errors.birthDate}</p>}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-left text-gray-600 mb-2">성별</label>
                <div className="flex justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: 'male' }))}
                    className={`px-8 py-3 rounded-full font-semibold transition duration-200 ${
                      formData.gender === 'male'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    남성
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, gender: 'female' }))}
                    className={`px-8 py-3 rounded-full font-semibold transition duration-200 ${
                      formData.gender === 'female'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    여성
                  </button>
                </div>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <button
                onClick={handleNext}
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
              >
                다음
              </button>
            </motion.div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            key="step4"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">연락처와 주소를 입력해주세요</h2>
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="block text-left text-gray-600 mb-1">전화번호</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="01012345678"
                  required
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <label className="block text-left text-gray-600 mb-1">주소</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="서울시 강남구"
                  required
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-8"
            >
              <button
                onClick={handleNext}
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
              >
                다음
              </button>
            </motion.div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div
            key="step5"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">서명을 입력해주세요</h2>
            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">서명</label>
              <SignaturePad ref={signaturePadRef} canvasProps={{ className: 'signature-canvas w-full h-32 border' }} />
              <button type="button" onClick={() => signaturePadRef.current.clear()} className="mt-2 px-4 py-2 bg-gray-200 rounded">지우기</button>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 space-y-4"
            >
              <button
                onClick={() => {
                  handleSaveSignature();
                  handleNext();
                }}
                className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
              >
                다음
              </button>
            </motion.div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div
            key="step6"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="text-center"
          >
            <h2 className="text-2xl font-bold mb-6">입력하신 정보를 확인해주세요</h2>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-50 rounded-xl p-6 space-y-4 text-left"
            >
              <div className="flex justify-between items-center">
                <span className="text-gray-600">이름</span>
                <span className="font-medium">{formData.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">이메일</span>
                <span className="font-medium">{formData.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">생년월일</span>
                <span className="font-medium">{formData.birthDate}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">성별</span>
                <span className="font-medium">{formData.gender === 'male' ? '남성' : '여성'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">전화번호</span>
                <span className="font-medium">{formatPhoneNumber(formData.phone)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">주소</span>
                <span className="font-medium">{formData.address}</span>
              </div>
            </motion.div>
            <div className="mt-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">서명 미리보기</label>
              <div className="border rounded bg-white flex items-center justify-center h-32">
                {signatureData ? (
                  <img src={signatureData} alt="서명 미리보기" className="h-24" />
                ) : (
                  <span className="text-gray-400">(서명 없음)</span>
                )}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 space-y-4"
            >
              <p className="text-gray-600">입력하신 정보가 모두 맞나요?</p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleBack}
                  className="bg-gray-100 text-gray-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition duration-200"
                >
                  수정하기
                </button>
                <button
                  onClick={handleSignup}
                  className="bg-blue-500 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-600 transition duration-200"
                  disabled={loading}
                >
                  {loading ? '처리 중...' : '가입하기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full relative">
        {currentStep > 1 && (currentStep !== 3 || !isGoogleUser) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            onClick={handleBack}
            className="absolute -top-12 left-0 bg-gray-100 text-gray-600 px-4 py-2 rounded-full font-semibold hover:bg-gray-200 transition duration-200 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            이전
          </motion.button>
        )}
        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Signup;
