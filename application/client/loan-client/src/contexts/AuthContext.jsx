import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { createWallet } from '../services/api'; 

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase 환경변수가 설정되지 않았습니다!');
  console.log('URL:', supabaseUrl);
  console.log('Key:', supabaseAnonKey);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 현재 세션 확인
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        setUser(user);
      } catch (error) {
        console.error('인증 상태 확인 중 오류 발생:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // user가 로그인되면 wallet 존재 여부 확인 후 생성
  useEffect(() => {
    const ensureWallet = async () => {
      if (!user?.id) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('wallet_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ wallet 조회 실패:', error);
        return;
      }

      if (!profile?.wallet_id) {
        console.log('🧾 wallet_id 없음, 자동 생성 시작:', user.id);
        try {
          await createWallet(user.id);
          console.log('✅ wallet 생성 완료');
        } catch (err) {
          console.error('❌ wallet 생성 실패:', err.message);
        }
      }
    };

    ensureWallet();
  }, [user?.id]);

  const value = {
    user,
    loading,
    supabase,
    signIn: async (email, password) => {
      try {
        console.log('이메일 로그인 시도:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) {
          console.error('로그인 에러:', error);
          throw error;
        }
        console.log('로그인 성공:', data);
        return { data, error: null };
      } catch (error) {
        console.error('로그인 처리 중 에러:', error);
        return { data: null, error };
      }
    },
    signUp: async (email, password) => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        return { data, error: null };
      } catch (error) {
        console.error('회원가입 에러:', error);
        return { data: null, error };
      }
    },
    signOut: async () => {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      } catch (error) {
        console.error('로그아웃 에러:', error);
        throw error;
      }
    },
    signInWithGoogle: async () => {
      try {
        console.log('구글 로그인 시도...');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: process.env.REACT_APP_REDIRECT_URL || window.location.origin + '/signup',
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });
        if (error) {
          console.error('구글 로그인 에러:', error);
          throw error;
        }
        console.log('구글 로그인 응답:', data);
        return { data, error: null };
      } catch (error) {
        console.error('구글 로그인 처리 중 에러:', error);
        return { data: null, error };
      }
    },
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth는 반드시 AuthProvider 내부에서 사용해야 합니다');
  }
  return context;
}; 