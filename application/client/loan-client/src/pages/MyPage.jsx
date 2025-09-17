// src/pages/MyPage.jsx

import React, { useEffect, useState } from 'react';
import { getCurrentUser, getUserProfile, getWalletBalance } from '../services/api';
import { useNavigate } from 'react-router-dom';

const MyPage = () => {
  const [profile, setProfile] = useState(null);
  const [balance, setBalance] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const navigate = useNavigate();

  // 1) 로그인된 유저 + 프로필 + 잔액 한 번에 로드
  useEffect(() => {
    const load = async () => {
      try {
        // Supabase Auth user
        const user = await getCurrentUser();
        // profiles 테이블에서 모든 칼럼(*) 가져오기
        const prof = await getUserProfile(user.id);
        setProfile(prof);
        // wallet_id 가 있으면 잔액 조회
        if (prof.wallet_id) {
          const bal = await getWalletBalance(prof.wallet_id);
          setBalance(bal);
        }
      } catch (err) {
        console.error('마이페이지 로드 실패:', err);
        // 필요시 에러 처리
      }
    };
    load();
  }, []);

  // 지갑 ID 복사 / 연결 해제 토글
  const handleCopyOrDisconnect = () => {
    if (!profile?.wallet_id) return;
    navigator.clipboard.writeText(profile.wallet_id)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('클립보드 복사 실패:', err);
        alert('지갑 ID 복사에 실패했습니다.');
      });
  };

  if (!profile) {
    return (
      <main className="flex-1 p-8">
        <p>로딩 중...</p>
      </main>
    );
  }

  // 동적으로 보여줄 항목 목록
  const items = [
    { label: '이메일',     value: profile.email },
    { label: '이름',       value: profile.name            },
    { label: '전화번호',   value: profile.phone           },
    { label: '생년월일',   value: profile.birth_number    },
    { label: '성별',       value: profile.gender          },
    { label: '잔액',       value: `${balance.toLocaleString()} KRW` },
    { label: '지갑',       value: profile.wallet_id       },
    // 추가하고 싶은 칼럼이 생기면 여기만 추가!
  ];

  return (
    <main className="flex-1 overflow-auto bg-white">
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-8">내 정보</h1>

        <div className="bg-white border rounded-lg divide-y">
          {items.map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center px-6 py-4">
              <div className="text-sm text-gray-500 w-32">{label}</div>
              <div className="flex-1 text-gray-800">
                {value || '-'}
              </div>
              {label === '지갑' && profile.wallet_id && (
                <button
                  onClick={handleCopyOrDisconnect}
                  className="ml-4 bg-red-100 text-red-600 hover:bg-red-200 transition-all text-sm px-4 py-2 rounded"
                >
                  {isCopied ? '복사됨' : '지갑 복사'}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default MyPage;
