import React, { useEffect, useState } from 'react';
import willService from '../services/willService';

function UserProfileComponent() {
  const [realName, setRealName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const usernameFromSession = sessionStorage.getItem('username');
    if (usernameFromSession) {
      willService.queryByName(usernameFromSession)
        .then(response => {
          setRealName(response.data.realName);
        })
        .catch(err => {
          console.error("실명 조회 실패:", err);
          setError(err.response?.data?.error || '실명 조회 중 오류 발생');
          setRealName(''); // 에러 시 실명 초기화
        });
    }
  }, []); // 컴포넌트 마운트 시 한 번 실행

  if (error) {
    return <p>오류: {error}</p>;
  }

  return (
    <div>
      {realName ? <p>사용자 실명: {realName}</p> : <p>실명 정보를 불러오는 중...</p>}
    </div>
  );
}

export default UserProfileComponent;