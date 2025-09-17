import React, { useState } from 'react';
import willService from '../services/willService';
//유언장 등록
export default function WillForm() {
  const [title, setTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [beneficiaries, setBeneficiaries] = useState('[]');
  const [testatorId, setTestatorId] = useState('user1');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = async () => {
    if (!title || !originalContent || !testatorId) {
      setMessage('오류: 제목, 원본 내용, 작성자 ID는 필수입니다.');
      setMessageType('error');
      return;
    }

    let beneficiariesArray;
    try {
      beneficiariesArray = JSON.parse(beneficiaries);
      if (!Array.isArray(beneficiariesArray)) throw new Error();
    } catch {
      beneficiariesArray = [];
      setMessage('경고: 수혜자 목록이 잘못되어 빈 배열로 처리됩니다.');
      setMessageType('warning');
    }

    try {
      const res = await willService.registerWill({
        title,
        originalContent,
        beneficiaries: beneficiariesArray,
        testatorId
      });
      setMessage(`등록 성공! 블록체인 ID: ${res.data.blockchainWillId}`);
      setMessageType('success');
    } catch (err) {
      setMessage('등록 실패: ' + (err.response?.data?.error || err.message));
      setMessageType('error');
    }
  };

  return (
    <div className="form-group">
      <h3>유언장 등록</h3>
      {message && <p style={{ color: messageType === 'error' ? 'red' : messageType === 'success' ? 'green' : 'orange' }}>{message}</p>}
      <input className="form-control mb-2" placeholder="제목" value={title} onChange={e => setTitle(e.target.value)} />
      <textarea className="form-control mb-2" placeholder="내용" value={originalContent} onChange={e => setOriginalContent(e.target.value)} />
      <input className="form-control mb-2" placeholder='["홍길동","김철수"]' value={beneficiaries} onChange={e => setBeneficiaries(e.target.value)} />
      <input className="form-control mb-2" placeholder="작성자 ID" value={testatorId} onChange={e => setTestatorId(e.target.value)} />
      <button className="btn btn-success" onClick={handleSubmit}>유언장 등록</button>
    </div>
  );
}
