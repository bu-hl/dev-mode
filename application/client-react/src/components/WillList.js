import React, { useState } from 'react';
import willService from '../services/willService';
//유언장 목록 조회 + 검색
export default function WillList({ onSelect }) {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleFetch = async () => {
    setStatus('조회 중...');
    try {
      const res = await willService.getMyWills();
      if (Array.isArray(res.data) && res.data.length > 0) {
        setList(res.data);
        setStatus(`${res.data.length}개의 유언장이 조회되었습니다.`);
      } else {
        setStatus('작성한 유언장이 없습니다.');
        setList([]);
      }
    } catch (err) {
      setStatus('조회 실패: ' + (err.response?.data?.error || err.message));
    }
  };

  const filteredList = list.filter(item => {
    const id = item.willID || item.Key || '';
    const title = item.title || '';
    const keyword = searchTerm.toLowerCase();
    return (
      id.toLowerCase().includes(keyword) ||
      title.toLowerCase().includes(keyword)
    );
  });

  return (
    <div className="form-group">
      <h3>나의 유언장 목록 조회</h3>
      <button className="btn btn-info mb-2" onClick={handleFetch}>조회하기</button>
      <input
        className="form-control mb-2"
        placeholder="검색어를 입력하세요 (ID 또는 제목)"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />
      <p>{status}</p>
      <ul className="list-group">
        {filteredList.map((item, idx) => (
          <li
            key={idx}
            className="list-group-item list-group-item-action"
            style={{ cursor: 'pointer' }}
            onClick={() => onSelect?.(item.willID || item.Key)}
          >
            <strong>ID:</strong> {item.willID || item.Key}<br />
            <strong>제목:</strong> {item.title || '제목 없음'}
          </li>
        ))}
      </ul>
    </div>
  );
}
