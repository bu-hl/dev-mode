import React, { useState } from 'react';
import './css/RegisterPagecss/RegisterPage.css';

const RegisterPage = () => {
  const [memberType, setMemberType] = useState('personal');
  const [gender, setGender] = useState('male');
  const [birthType, setBirthType] = useState('solar');

  return (
    <div className="page-wrapper">
      <div className="content">
        <h2 className="title">가입을 시작합니다.</h2>
        <p className="subtitle">마침표에 오신것을 환영합니다.</p>

        {/* 회원인증 */}
        <div className="section-wrapper">
          <div className="section-header">
            <span>회원인증</span>
          </div>
          <div className="section-content">
            <div className="row">
              <label>
                <input
                  type="radio"
                  name="memberType"
                  value="personal"
                  checked={memberType === 'personal'}
                  onChange={() => setMemberType('personal')}
                /> 개인회원
              </label>
            </div>
          </div>
        </div>

        {/* 기본정보 */}
        <div className="section-wrapper">
          <div className="section-header">
            <span>기본정보</span>
            <span style={{ color: '#e74c3c', fontSize: '12px' }}>필수</span>
          </div>
          <div className="section-content">
            {[
              { label: '아이디', type: 'text', placeholder: '아이디 입력', required: true },
              { label: '비밀번호', type: 'password', placeholder: '비밀번호 입력', required: true },
              { label: '비밀번호 확인', type: 'password', placeholder: '비밀번호 재입력', required: true },
              { label: '이름', type: 'text', placeholder: '이름 입력', required: true },
            ].map((field, idx) => (
              <div className="row" key={idx}>
                <label className={`label${field.required ? ' required' : ''}`}>
                  {field.label}
                </label>
                <input
                  className="input"
                  type={field.type}
                  placeholder={field.placeholder}
                />
              </div>
            ))}

            {/* 주소검색 */}
            <div className="row address-row">
              <label className="label">주소</label>
              <input
                className="input"
                type="text"
                placeholder="우편번호"
              />
              <button
                type="button"
                className="button"
                
              >
                주소검색
              </button>
            </div>
            <div className="row">
              <label className="label" />
              <input className="input" type="text" placeholder="기본주소" />
            </div>
            <div className="row">
              <label className="label" />
              <input className="input" type="text" placeholder="나머지 주소(선택 입력 가능)" />
            </div>

            {/* 일반전화 */}
            <div className="row phone-row">
              <label className="label">일반전화</label>
              <select className="select">
                <option>02</option><option>031</option><option>010</option>
              </select>
              <input className="input" type="text" />
              <input className="input" type="text" />
            </div>

            {/* 휴대전화 */}
            <div className="row mobile-row">
              <label className="label required">휴대전화</label>
              <select className="select">
                <option>010</option><option>011</option>
              </select>
              <input className="input" type="text" />
              <input className="input" type="text" />
            </div>

            {/* 이메일 */}
            <div className="row">
              <label className="label">이메일</label>
              <input className="input" type="email" placeholder="example@domain.com" />
            </div>
          </div>
        </div>

        {/* 추가정보 */}
        <div className="section-wrapper">
          <div className="section-header">
            <span>추가정보</span>
          </div>
          <div className="section-content">
            {/* 성별 행 - 인라인 스타일로 한 줄 고정 및 간격 조정 */}
            <div
              className="row"
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'nowrap',
              }}
            >
              <span
                className="label required"
                style={{ marginRight: '16px' }}
              >
                성별
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={() => setGender('male')}
                    style={{ marginRight: '4px' }}
                  />
                  남자
                </label>
                <label style={{ display: 'flex', alignItems: 'center' }}>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={() => setGender('female')}
                    style={{ marginRight: '4px' }}
                  />
                  여자
                </label>
              </div>
            </div>

            {/* 생년월일 */}
            <div className="row">
              <label className="label required">생년월일</label>
              <input className="input" type="text" placeholder="년" style={{ maxWidth: '80px' }} />
              <input className="input" type="text" placeholder="월" style={{ maxWidth: '50px' }} />
              <input className="input" type="text" placeholder="일" style={{ maxWidth: '50px' }} />
            </div>
          </div>
        </div>

        <button className="submit-button">가입하기</button>
      </div>
    </div>
  );
};

export default RegisterPage;
