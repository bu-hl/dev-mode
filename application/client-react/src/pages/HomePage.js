import React from 'react';
import './css/Homepagecss/HomePage.css';
import './css/Homepagecss/HeroSection.css';
import './css/Homepagecss/StepTimeline.css';
import './css/Homepagecss/WhySection.css';
import './css/Homepagecss/WillPreviewSection.css';
import './css/Homepagecss/TestimonialsSection.css';
import './css/Homepagecss/StartFooterSection.css';

const HomePage = () => {
  const features = [
    { title: "블록체인으로 위변조 방지", desc: "기록된 유언장은 변경이 불가해 위변조 걱정이 없습니다.",image: "/images/B1.PNG"},
    { title: "법적 효력 연동", desc: "공증 및 인증 기관과 연동하여 법적 효력을 인정받습니다.",image: "/images/B2.PNG"},
    { title: "가족 간 분쟁 예방", desc: "명확하고 안전하게 전달되어 분쟁을 예방합니다.",image: "/images/B3.PNG"},
    { title: "암호화된 보안", desc: "블록체인 기반 저장과 암호화 열람으로 보안이 강화됩니다.",image: "/images/B4.PNG"},
    { title: "분산 저장 시스템", desc: "유언장을 안전하게 여러 네트워크에 분산 저장합니다.",image: "/images/B5.PNG"},
    { title: "유언장 접근 제한", desc: "열람 권한이 있는 사용자만 접근 가능하게 설정됩니다.",image: "/images/B6.PNG"},
  ];

  return (
    <div className="container" id="service">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-text">
          <h1 className="hero-title">
            당신의 마지막 뜻,<br />
            <span>안전하게 남기는</span> 가장 현대적인 방법.
          </h1>
          <p className="hero-desc">
            마침표는 블록체인 기반 유언장 공증 플랫폼입니다. <br />
            지정한 사람만 열람 가능한, 위조 걱정 없는 유언장을 남겨보세요.
          </p>
          <div className="button-group">
            <button className="primary-button">유언장 작성 시작하기</button>
            <button className="secondary-button">서비스 소개 보기</button>
          </div>
        </div>
        <div className="hero-card">
          <div className="card-header">임시화면</div>
          <h3 className="card-title">나의 마지막 유언장</h3>
          <div className="card-box">블록체인으로 안전하게 보호됨</div>
          <div className="card-footer">
            <div>지정 열람자: 3명</div>
            <div>공증 상태: 완료</div>
          </div>
        </div>
      </section>

      {/* Step Timeline Section */}
      <section className="step-container" id="features">
        <h2 className="step-title">서비스 작동 원리</h2>
        <p className="step-desc">
          마침표는 최신 블록체인 기술을 활용하여 당신의 소중한 유언을 안전하게 보호하고 전달합니다.
        </p>


         <div className="step-timeline">
          <div className="step-item">
            <div className="icon-circle">📄</div>
            <div className="step-label">유언장 작성</div>
            <p className="step-text">간단한 인터페이스를 통해 디지털 유언장을 작성합니다.</p>
            <span className="connector">→</span>
          </div>
          <div className="step-item">
            <div className="icon-circle">🖋️</div>
            <div className="step-label">공증 연동</div>
            <p className="step-text">블록체인 기술로 유언장의 진위와 법적 효력을 부여합니다.</p>
            <span className="connector">→</span>
          </div>
          <div className="step-item">
            <div className="icon-circle">👥</div>
            <div className="step-label">열람자 지정</div>
            <p className="step-text">귀하의 유언장을 열람할 수 있는 사람을 직접 지정합니다.</p>
            <span className="connector">→</span>
          </div>
          <div className="step-item">
            <div className="icon-circle">🔐</div>
            <div className="step-label">사망 시 자동 열람</div>
            <p className="step-text">사전 설정된 조건에 따라 지정된 사람에게만 유언장이 공개됩니다.</p>
          </div>
        </div>

        
      </section>

      {/* Why Us Section */}
      <section className="why-section">
        <h2 className="step-title">왜 마침표인가요?</h2>
        <p className="step-desc">
          신뢰할 수 있는 기술과 절차를 통해 삶의 마지막을 위한 최적의 유언 솔루션을 제공합니다.
        </p>
      <div className="feature-grid">
        {features.map((item, i) => (
          <div className="feature-card" key={i}>
            <img src={item.image} alt={item.title} className="feature-icon" />
            <h4 className="feature-title">{item.title}</h4>
            <p className="feature-desc">{item.desc}</p>
          </div>
        ))}
      </div>
      </section>

<section className="will-preview-section">
  {/* 중앙 정렬된 제목/설명 */}
  <div className="preview-header">
    <h2 className="preview-title">유언장 미리보기</h2>
    <p className="preview-sub">
      마침표의 디지털 유언장은 직관적인 인터페이스로 중요한 정보를<br />
      한눈에 확인할 수 있습니다.
    </p>
  </div>
  {/* 아래 본문: 좌우 배치 */}
  <div className="preview-content">
    {/* 왼쪽 카드 */}
    <div className="preview-left">
<div className="preview-card">
  <div className="preview-card-header">
    <span className="status-tag">
  <img src="/images/C1.PNG" alt="암호화됨" className="status-icon" />
  암호화됨
</span>
    <span className="preview-date">
  <img src="/images/C2.PNG" alt="날짜" className="preview-icon" />
  2023년 10월 15일
</span>
  </div>
  <h3 className="preview-card-title">가족에게 남기는 마지막 이야기</h3>
  <div className="preview-card-body">
  <img
  src="/images/C3.PNG"
  alt="문서 아이콘"
  style={{ width: "32px", height: "32px" }}
/>
  <span>암호화된 유언장 내용</span>
  </div>
  <div className="preview-card-footer">
    <div className="preview-tag">
      <span className="tag-label">
  <img src="/images/C4.PNG" alt="열람자" className="tag-icon" />
  지정 열람자
</span>
      <span className="tag-value">3명</span>
    </div>
    <div className="preview-tag">
      <span className="tag-label">
  <img src="/images/C5.PNG" alt="공증 상태" className="tag-icon" />
  공증 상태
</span>
      <span className="tag-value verified">완료</span>
    </div>
  </div>
</div>
    </div>
    {/* 오른쪽 설명 블록 */}
    <div className="preview-right">
      <div className="preview-info-block">
        <h4>맞춤형 유언장 카드</h4>
        <p>
          마침표의 유언장 카드는 중요한 정보를 한눈에 볼 수 있도록 설계되었습니다. <br />
          지정 열람자 수, 유언장 제목, 작성 날짜, 보안 상태 등 필수 정보를 직관적으로 확인할 수 있습니다.
        </p>
      </div>
      <div className="preview-info-block">
        <h4>안전한 보관</h4>
        <p>
          블록체인 기술을 활용한 분산 저장 방식으로 데이터 손실 걱정 없이 영구적으로 보관됩니다. <br />
          암호화 기술로 보호되어 지정된 조건이 충족될 때만 열람이 가능합니다.
        </p>
      </div>
      <div className="preview-info-block">
        <h4>쉬운 관리</h4>
        <p>
          언제든지 내용을 수정하거나 열람자를 변경할 수 있으며, 변경 이력은 모두 안전하게 기록됩니다. <br />
          유언장 작성과 관리가 이보다 더 쉬울 수 없습니다.
        </p>
      </div>
    </div>
  </div>
</section>



<section className="testimonial-section" id ="review">
  <div className="testimonial-header">
    <h2 className="testimonial-title">사용자 이야기</h2>
    <p className="testimonial-sub">
      마침표를 통해 소중한 가족의 미래를 준비한 사용자들의 실제 경험을 들어보세요.
    </p>
  </div>

  <div className="testimonial-grid">
    {[
      {
        name: "김민수",
        job: "40대 회사원",
        image: "/images/kim.PNG",  // 수정됨
        quote:
          "아버지가 남기신 말 한 마디, 우리 가족 모두가 함께 들을 수 있었어요. 마침표 덕분에 아버지의 마지막 뜻을 명확히 알 수 있었습니다.",
      },
      {
        name: "이지현",
        job: "50대 자영업자",
        image: "/images/ei.PNG",  // 수정됨
        quote:
          "복잡한 상속 문제로 가족 간 갈등이 있었는데, 마침표를 통해 작성한 유언장 덕분에 모든 것이 명확해졌어요. 이제 마음의 평화를 찾았습니다.",
      },
      {
        name: "박준호",
        job: "30대 IT 전문가",
        image: "/images/back.PNG",  // 수정됨
        quote:
          "기술에 익숙하지 않은 부모님을 위해 마침표를 소개해드렸어요. 너무 쉬운 인터페이스에 부모님도 직접 사용하실 수 있었고, 이제 가족 모두 안심하고 있습니다.",
      },
    ].map((user, index) => (
      <div className="testimonial-card" key={index}>
        <div className="user-info">
          <img src={user.image} alt={user.name} className="user-avatar" />
          <div className="user-meta">
            <strong className="user-name">{user.name}</strong>
            <span className="user-job">{user.job}</span>
          </div>
        </div>
        <p className="user-quote">"{user.quote}"</p>
      </div>
    ))}
  </div>
</section>



<section className="get-start-section" id ="faq">
  <h2 className="get-start-title">시작하기</h2>
  <p className="get-start-sub">마침표와 함께 소중한 유언을 안전하게 남기는 방법을 알아보세요.</p>
  <div className="get-start-grid">
    {/* 왼쪽: 가이드 */}
    <div className="guide-block">
      <h4 className="guide-title">간단한 시작 가이드</h4>

      <div className="guide-item">
        <img className="guide-icon" src="/images/A1.PNG" alt="지갑 등록" />
        <div className="guide-text">
          <strong className="guide-text-title">지갑 등록</strong>
          <p className="guide-text-sub">블록체인 지갑을 연결하여 신원을 안전하게 인증합니다.</p>
        </div>
      </div>

      <div className="guide-item">
        <img className="guide-icon" src="/images/A2.PNG" alt="유언장 생성" />
        <div className="guide-text">
          <strong className="guide-text-title">테스트 유언장 생성</strong>
          <p className="guide-text-sub">무료로 테스트 유언장을 작성해보세요.</p>
        </div>
      </div>

      <div className="guide-item">
        <img className="guide-icon" src="/images/A3.PNG" alt="공증 요청" />
        <div className="guide-text">
          <strong className="guide-text-title">공증 요청</strong>
          <p className="guide-text-sub">작성한 유언장에 법적 효력을 부여하세요.</p>
        </div>
      </div>

      <div className="cta-box">
        <h4>마침표와 함께 시작하세요</h4>
        <p>지금 바로 무료 테스트 유언장을 작성해보세요.</p>
        <button className="cta-button">무료로 시작하기</button>
      </div>
    </div>

    {/* 오른쪽 FAQ + 문의 */}
    <div className="faq-block">
      <h4 className="faq-title">
  <img src="/images/D1.PNG" alt="자주 묻는 질문" className="faq-icon" />
  자주 묻는 질문
</h4>
      <div className="faq-question">
        <p className="faq-question-title">마침표의 유언장은 법적 효력이 있나요?</p>
        <p className="faq-question-text">네, 공증 시스템과 연동되어 법적 효력을 갖습니다.</p>
      </div>
      <hr className="section-divider" />
      <div className="faq-question">
        <p className="faq-question-title">유언장 내용을 나중에 수정할 수 있나요?</p>
        <p className="faq-question-text">네, 수정 시마다 변경 이력이 안전하게 기록됩니다.</p>
      </div>
      <hr className="section-divider" />
      <div className="faq-question">
        <p className="faq-question-title">지정 열람자는 어떻게 설정하나요?</p>
        <p className="faq-question-text">작성 과정에서 이메일 주소를 입력해 설정할 수 있습니다.</p>
      </div>

      <div className="inquiry-box">
        <div className="inquiry-text">
          <strong className="inquiry-title">더 궁금한 점이 있으신가요?</strong>
          <p className="inquiry-sub">언제든지 문의해주세요.</p>
        </div>
        <button className="inquiry-button">문의하기</button>
      </div>
    </div>
  </div>

  <div className="legal-footer-note">
    마침표는 공신력 있는 기관들과 협력하여 서비스의 신뢰성과 안전성을 보장합니다.
  </div>
</section>

    </div>
  );
};

export default HomePage;
