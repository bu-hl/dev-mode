import React from 'react';
import './css/MyPagecss/mypage.css';

const MyPage = () => { //pr테스트용 주석
  return (
    <div className="mypage-container">
      {/* 프로필 상단 */}
      <div className="mypage-profile">
        <div className="profile-info">
          <img src="/images/kim.PNG" alt="프로필 사진" className="profile-image" />
          <div className="profile-text">
            <strong className="profile-name">김용현</strong>
            <p className="profile-email">kim.yh@example.com</p>
            <span className="profile-date">가입일: 2023년 8월</span>
          </div>
        </div>
        <button className="edit-profile-button">프로필 수정</button>
      </div>

      {/* 유언장 통계 */}
      <div className="mypage-stats">
        {[
          { label: '작성 중인 유언장', value: 2 },
          { label: '공증 진행 중', value: 1 },
          { label: '공증 완료', value: 3 },
          { label: '지정 열람자', value: 5 },
        ].map((item, index) => (
          <div className="stat-card" key={index}>
            <div className="stat-value">{item.value}</div>
            <div className="stat-label">{item.label}</div>
          </div>
        ))}
      </div>

      {/* 빠른 작업 */}
      <div className="mypage-actions">
        <div className="action-button">
          <img src="/images/E1.PNG" alt="새 유언장 작성" />
          <span>새 유언장 작성</span>
        </div>
        <div className="action-button">
          <img src="/images/E2.PNG" alt="열람자 관리" />
          <span>열람자 관리</span>
        </div>
        <div className="action-button">
          <img src="/images/E3.PNG" alt="보안 설정" />
          <span>보안 설정</span>
        </div>
      </div>

      {/* 활동 내역 + 설정 */}
      <div className="mypage-columns">
        {/* 최근 활동 */}
        <div className="mypage-recent">
          <h4>최근 활동</h4>
          <ul>
            {[
              { text: '주 유언장 내용 수정', date: '2023.11.15' },
              { text: '새로운 열람자 추가: 김미란', date: '2023.11.13' },
              { text: '유언장 공증 완료', date: '2023.11.10' },
              { text: '2단계 인증 활성화', date: '2023.11.08' },
            ].map((item, index) => (
              <li key={index}>
                <span>
                  <img src="/images/E7.PNG" alt="시계 아이콘" className="icon" />
                  {item.text}
                </span>
                <span className="date">{item.date}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 사이드 설정 */}
        <div className="mypage-side">
          {/* 보안 설정 */}

        <div className="security-settings">
          <h4>보안 설정</h4>
          <ul className="settings-list">
            <li>
              <div className="settings-item">
                <img src="/images/E4.PNG" alt="2단계 인증" className="icon" />
                <span>2단계 인증</span>
                <img src="/images/E9.PNG" alt="화살표" className="arrow" />
              </div>
            </li>
            <li>
              <div className="settings-item">
                <img src="/images/E5.PNG" alt="알림 설정" className="icon" />
                <span>알림 설정</span>
                <img src="/images/E9.PNG" alt="화살표" className="arrow" />
              </div>
            </li>
            <li>
              <div className="settings-item">
                <img src="/images/E6.PNG" alt="계정 설정" className="icon" />
                <span>계정 설정</span>
                <img src="/images/E9.PNG" alt="화살표" className="arrow" />
              </div>
            </li>
          </ul>
        </div>


          {/* 연동 서비스 */}
          <div className="linked-services">
            <h4>연동 서비스</h4>
            <p>
              공증 서비스 <span className="active">연동됨</span>
            </p>
            <p>
              블록체인 지갑 <span className="active">연동됨</span>
            </p>
          </div>

          {/* 로그아웃 버튼 */}
          <button className="logout-button">
            <img src="/images/E8.PNG" alt="로그아웃 아이콘" className="icon" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyPage;
