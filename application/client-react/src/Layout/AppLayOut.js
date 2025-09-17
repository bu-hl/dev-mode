import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { FaFacebookF, FaTwitter, FaUser } from "react-icons/fa";

/* ---------------- STYLE ---------------- */

const Container = styled.div`
  background-color: #f9fafb;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Navbar = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
`;

const Logo = styled.div`
  font-weight: 700;
  font-size: 20px;
  color: #111827;
  cursor: pointer;
`;

const NavMenu = styled.nav`
  display: flex;
  gap: 32px;
  font-size: 14px;

  button {
    background: none;
    border: none;
    color: #4b5563;
    font-size: 14px;
    cursor: pointer;

    &:hover {
      color: #6366f1;
    }
  }
`;

const NavButtons = styled.div`
  display: flex;
  gap: 12px;

  button {
    font-size: 14px;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 500;
  }

  .login {
    background-color: transparent;
    color: #6366f1;
    border: 1px solid #6366f1;
  }

  .signup {
    background-color: #6366f1;
    color: white;
    border: none;
  }
`;

const Footer = styled.footer`
  background-color: #1f2937;
  color: #9ca3af;
  padding: 48px 32px 24px;
  font-family: 'Inter', sans-serif;
  margin-top: auto;
`;

const FooterTop = styled.div`
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 32px;
`;

const FooterBrand = styled.div`
  flex: 1;

  h4 {
    font-size: 18px;
    color: #ffffff;
    margin-bottom: 12px;
  }

  p {
    margin-bottom: 16px;
  }

  .icons {
    display: flex;
    gap: 16px;

    svg {
      font-size: 18px;
      cursor: pointer;

      &:hover {
        color: #ffffff;
      }
    }
  }
`;

const FooterColumn = styled.div`
  flex: 1;

  h5 {
    color: #ffffff;
    font-weight: 600;
    margin-bottom: 12px;
  }

  div {
    margin-bottom: 6px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;

const FooterBottom = styled.div`
  border-top: 1px solid #374151;
  margin-top: 32px;
  padding-top: 24px;
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  align-items: center;

  input {
    background-color: #374151;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 8px 0 0 8px;
    outline: none;
  }

  button {
    background-color: #6366f1;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    cursor: pointer;
  }
`;

/* ---------------- COMPONENT ---------------- */

const AppLayout = () => {
  const navigate = useNavigate();

  const handleScrollToSection = (sectionId) => {
    navigate('/');
    setTimeout(() => {
      const section = document.getElementById(sectionId);
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <Container>
      {/* Navbar */}
      <Navbar>
        <Logo onClick={() => navigate('/')}>마침표</Logo>
        <NavMenu>
          <button onClick={() => handleScrollToSection('service')}>서비스 소개</button>
          <button onClick={() => handleScrollToSection('features')}>특징</button>
          <button onClick={() => handleScrollToSection('review')}>이용 후기</button>
          <button onClick={() => handleScrollToSection('faq')}>FAQ</button>
        </NavMenu>
        <NavButtons>
          <button className="login" onClick={() => navigate('/login')}>로그인</button>
          <button className="signup" onClick={() => navigate('/register')}>회원가입</button>
        </NavButtons>
      </Navbar>

      {/* Main content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <Footer>
        <FooterTop>
          <FooterBrand>
            <h4>마침표</h4>
            <p>블록체인 기반 유언장 공증 플랫폼으로<br />소중한 당신의 마지막 뜻을 안전하게 남기세요.</p>
            <div className="icons">
              <FaFacebookF />
              <FaTwitter />
              <FaUser />
            </div>
          </FooterBrand>

          <FooterColumn>
            <h5>서비스</h5>
            <div onClick={() => navigate('/write')}>유언장 작성</div>
            <div>공증 서비스</div> 
            <div onClick={() => navigate('/Detail')}>유언장 관리</div>
            <div>보안 정책</div>
          </FooterColumn>

          <FooterColumn>
            <h5>회사 정보</h5>
            <div>회사 소개</div>
            <div>이용약관</div>
            <div>개인정보처리방침</div>
            <div>문의하기</div>
          </FooterColumn>
        </FooterTop>

        <FooterBottom>
          <div>© 2023 마침표. All rights reserved.</div>
          <div>
            <input type="email" placeholder="이메일 주소" />
            <button>구독</button>
          </div>
        </FooterBottom>
      </Footer>
    </Container>
  );
};

export default AppLayout;
