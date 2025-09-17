// ... (import 구문 등은 동일)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import willService from '../services/willService'; // willService 임포트

export default function WillDetails() {
  const [willData, setWillData] = useState(null);
  const [displayData, setDisplayData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const { willId } = useParams();

  const [rawApiResponse, setRawApiResponse] = useState(null);


  useEffect(() => {
    if (!willId) {
      setErrorMsg("유언장 ID가 제공되지 않았습니다.");
      return;
    }

    const fetchDetailsAndRealName = async () => {
      setLoading(true);
      setErrorMsg('');
      setWillData(null);
      setDisplayData(null);
      setRawApiResponse(null);

      const loggedInUsername = sessionStorage.getItem('username');

      if (!loggedInUsername) {
        setErrorMsg("로그인이 필요합니다. 사용자 정보를 찾을 수 없습니다.");
        setLoading(false);
        return;
      }

      try {
        // service.getWillDetailsService는 이제 imageDataUrls (배열)을 포함한 객체를 반환합니다.
        const apiResponse = await willService.getWillDetails(willId, loggedInUsername);
        setRawApiResponse(apiResponse);

        let currentUserRealName = loggedInUsername;
        try {
          const nameRes = await willService.queryByName(loggedInUsername);
          currentUserRealName = nameRes.data.realName || loggedInUsername;
        } catch (nameErr) {
          console.error(`현재 사용자 실명 조회 실패 (username: ${loggedInUsername}):`, nameErr);
        }
        
        // apiResponse.creationTimestamp가 Unix 타임스탬프(초)인지, 아니면 ISO 문자열인지 확인 필요
        // 기존 코드에서는 apiResponse.creationTimestamp * 1000 으로 사용하고 있었음.
        // 체인코드에서 time.Now().UTC().Format(time.RFC3339)로 변경했으므로, new Date()에 바로 전달 가능.
        const creationTimestamp = apiResponse.createdAt ? new Date(apiResponse.createdAt).toLocaleString() : 'N/A';


        setDisplayData({
          title: apiResponse.title,
          originalContent: apiResponse.originalContent,
          // creationTimestamp: new Date(apiResponse.creationTimestamp * 1000).toLocaleString(), // 기존 방식
          creationTimestamp: creationTimestamp, // 수정된 체인코드의 createdAt 필드 사용
          testatorRealName: currentUserRealName,
          willID_display: apiResponse.id, // 체인코드 Will 구조체의 ID 필드 사용 (기존 willID에서 변경)
          // 여러 이미지 데이터 URL 배열을 displayData에 추가
          imageDataUrls: apiResponse.imageDataUrls || [] // imageDataUrls가 없을 경우 빈 배열로 초기화
        });
        setWillData(apiResponse);


      } catch (err) {
        let message = '유언장 조회 실패';
        if (err.response && err.response.data && err.response.data.message) {
          message += `: ${err.response.data.message}`;
        } else if (err.response && err.response.data && err.response.data.error) {
            message += `: ${err.response.data.error}`;
        } else if (err.message) {
          message += `: ${err.message}`;
        }
        setErrorMsg(message);
        console.error("WillDetails fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetailsAndRealName();
  }, [willId]);

  if (!willId && !loading && !errorMsg) return <p>유언장 ID가 선택되지 않았습니다.</p>;

  return (
    <div className="will-details-container form-group mt-4" style={styles.container}>
      <h3 style={styles.header}>유언장 상세 보기</h3>
      {loading && <p>조회 중...</p>}
      {errorMsg && <p className="text-danger" style={styles.errorText}>{errorMsg}</p>}
      
      {displayData && (
        <div style={styles.detailsBox}>
          <div style={styles.detailItem}>
            <strong style={styles.label}>블록체인 Will ID:</strong>
            <p style={styles.value}>{displayData.willID_display || 'N/A'}</p>
          </div>
          <div style={styles.detailItem}>
            <strong style={styles.label}>제목:</strong>
            <p style={styles.value}>{displayData.title || '제목 없음'}</p>
          </div>
          <div style={styles.detailItem}>
            <strong style={styles.label}>유언자:</strong>
            <p style={styles.value}>{displayData.testatorRealName}</p>
          </div>
          <div style={styles.detailItem}>
            <strong style={styles.label}>작성일시:</strong>
            <p style={styles.value}>{displayData.creationTimestamp}</p>
          </div>
          <div style={styles.detailItem}>
            <strong style={styles.label}>유언 내용:</strong>
            <pre style={{...styles.value, ...styles.contentBox}}>{displayData.originalContent || '내용 없음'}</pre>
          </div>

          {/* 여러 첨부 이미지 표시 부분 (수정됨) */}
          {displayData.imageDataUrls && displayData.imageDataUrls.length > 0 && (
            <div style={styles.detailItem}>
              <strong style={styles.label}>첨부 이미지:</strong>
              <div style={styles.imageListContainer}> {/* 이미지들을 담을 컨테이너 (스타일 추가 가능) */}
                {displayData.imageDataUrls.map((img, index) => (
                  <div key={img.id || index} style={styles.imageItem}> {/* 각 이미지를 감싸는 div */}
                    {img.url ? (
                      <img
                        src={img.url}
                        alt={img.fileName || `첨부 이미지 ${index + 1}`}
                        style={styles.attachedImage}
                      />
                    ) : (
                      <p style={styles.imageError}>이미지를 불러올 수 없습니다. (오류: {img.error || '알 수 없음'})</p>
                    )}
                    {img.fileName && <p style={styles.imageFileName}>{img.fileName}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 디버깅용 원본 데이터 표시 */}
      {rawApiResponse && (
        <div style={{ marginTop: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#f0f0f0' }}>
          <h4 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>원본 API 응답 (디버깅용):</h4>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.9em', backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(rawApiResponse, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// styles 객체 수정 및 추가
const styles = {
  // ... (기존 스타일들: container, header, detailsBox, detailItem, label, value, errorText, contentBox) ...
  attachedImage: { // 기존 스타일 유지 또는 약간 수정
    maxWidth: '100%',
    maxHeight: '400px', // 여러 이미지일 경우 각 이미지의 최대 높이를 조금 줄일 수 있음
    marginTop: '10px',
    marginBottom: '5px', // 파일 이름 표시를 위해 하단 마진 추가
    border: '1px solid #ddd',
    borderRadius: '4px',
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  imageListContainer: { // 여러 이미지를 나열할 컨테이너 스타일 (선택 사항)
    display: 'flex',
    flexDirection: 'column', // 이미지를 세로로 나열 (가로로 하려면 'row', flexWrap: 'wrap' 등 추가)
    gap: '15px', // 이미지 아이템 간 간격
  },
  imageItem: { // 각 이미지와 파일 이름을 묶는 아이템 스타일
    textAlign: 'center', // 내부 요소들 가운데 정렬
    paddingBottom: '10px',
    borderBottom: '1px solid #eee', // 각 이미지 아이템 구분선 (선택 사항)
  },
  imageFileName: {
    fontSize: '0.85em',
    color: '#555',
    marginTop: '5px',
  },
  imageError: {
    color: 'red',
    fontSize: '0.9em',
    marginTop: '10px',
  },
  contentBox: {
    backgroundColor: '#f9f9f9',
    padding: '15px',
    borderRadius: '4px',
    border: '1px solid #eee',
    minHeight: '100px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  container: {
    maxWidth: '700px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  header: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '25px',
    borderBottom: '2px solid #007bff',
    paddingBottom: '10px'
  },
  detailsBox: {
    padding: '15px',
    backgroundColor: '#fff',
    borderRadius: '5px',
  },
  detailItem: {
    marginBottom: '18px',
    paddingBottom: '10px',
    borderBottom: '1px dashed #eee',
  },
  label: {
    display: 'block',
    color: '#555',
    fontWeight: 'bold',
    marginBottom: '5px',
    fontSize: '0.95em',
  },
  value: {
    color: '#222',
    margin: '0',
    fontSize: '1em',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap', 
    wordBreak: 'break-word', 
  },
  errorText: {
    color: '#dc3545',
    textAlign: 'center',
  }
};