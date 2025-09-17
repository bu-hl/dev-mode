import React, { useEffect, useState } from 'react';
import willService from '../services/willService';
//유언장 상세 조회
export default function WillDetails({ willId }) {
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!willId) return;

    const fetchDetails = async () => {
      setLoading(true);
      setErrorMsg('');
      setData(null);
      try {
        const res = await willService.getWillDetails(willId);
        setData(res.data);
      } catch (err) {
        setErrorMsg('조회 실패: ' + (err.response?.data?.error || err.message));
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [willId]);

  if (!willId) return null;

  return (
    <div className="form-group mt-4">
      <h3>유언장 상세 보기</h3>
      <p><strong>Will ID:</strong> {willId}</p>
      {loading && <p>조회 중...</p>}
      {errorMsg && <p className="text-danger">{errorMsg}</p>}
      {data && (
        <pre className="response-area" style={{ backgroundColor: '#f8f9fa', padding: '10px', border: '1px solid #ccc' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
