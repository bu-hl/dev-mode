import React, { useState, useEffect } from "react"; // useState, useEffect import
import styled from "styled-components";
import {
  FaCheckCircle,
  FaDownload,
  FaPen,
  FaTrashAlt,
  FaUserFriends,
  FaLock,
  FaShieldAlt,
  FaFileAlt,
  FaClock,
  FaTimesCircle, // 불일치 아이콘 추가
  FaQuestionCircle, // 로딩/미확인 아이콘 추가
  FaSpinner, // 로딩 아이콘 추가
} from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom"; // useParams, useNavigate import
import willService from "../services/willService"; // willService import

// Styled-components 정의 (기존과 동일)
const Container = styled.div`
  max-width: 1000px;
  margin: 40px auto;
  padding: 24px;
  font-family: "Pretendard", -apple-system, BlinkMacSystemFont, system-ui, Roboto,
    "Helvetica Neue", "Segoe UI", "Apple SD Gothic Neo", "Noto Sans KR",
    "Malgun Gothic", sans-serif;
`;

const SummaryCard = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
`;

const SummaryTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
`;

const SummaryTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 8px 0;
`;

const SummaryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  background-color: #e0f2fe; /* Light blue */
  color: #0ea5e9; /* Sky blue */
  padding: 6px 12px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 600;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const BaseButton = styled.button`
  display: inline-flex;
  align-items: center;
  padding: 10px 18px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  border: 1px solid transparent;
`;

const EditButton = styled(BaseButton)`
  background-color: #4f46e5; /* Indigo */
  color: white;
  &:hover {
    background-color: #4338ca;
  }
`;

const DeleteButton = styled(BaseButton)`
  background-color: #fee2e2; /* Light red */
  color: #ef4444; /* Red */
  border-color: #ef4444;
  &:hover {
    background-color: #fecaca;
  }
`;

const SummaryInfoRow = styled.div`
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 0.9rem;
  margin-bottom: 16px;
`;

const Dot = styled.span`
  margin: 0 8px;
`;

const SummaryText = styled.span``;

const SummaryMetaRow = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`;

const MetaBadge = styled.span`
  display: inline-flex;
  align-items: center;
  background-color: #f3f4f6; /* Light gray */
  color: #4b5563; /* Gray */
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.875rem;
`;

const TwoColumn = styled.div`
  display: flex;
  gap: 32px;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: 32px;
`;

const LeftColumn = styled(Column)`
  flex: 2;
`;

const RightColumn = styled(Column)`
  flex: 1;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 20px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
`;

const Paragraph = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  color: #4b5563;
  margin-bottom: 16px;
`;

const SubTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 20px 0 10px 0;
`;

const List = styled.ul`
  list-style: disc;
  padding-left: 20px;
  margin-bottom: 16px;
  color: #4b5563;
  li {
    margin-bottom: 8px;
    line-height: 1.6;
  }
`;

const DocList = styled.div``;

const DocItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f3f4f6;
  &:last-child {
    border-bottom: none;
  }
`;

const DocInfo = styled.div`
  display: flex;
  align-items: center;
  color: #374151;
  font-size: 0.95rem;
`;

const DocMeta = styled.div`
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 0.9rem;
  a {
    display: inline-flex;
    align-items: center;
    text-decoration: none;
    color: #6366f1;
    &:hover {
      text-decoration: underline;
    }
  }
`;

const HistoryList = styled.div``;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  font-size: 0.95rem;
  color: #4b5563;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
  &:last-child {
    border-bottom: none;
  }
`;

const FlexHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h2 {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }
`;

const ManageLink = styled.a`
  font-size: 0.9rem;
  color: #6366f1;
  text-decoration: none;
  font-weight: 500;
  &:hover {
    text-decoration: underline;
  }
`;

const ViewerBox = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: ${props => props.approved ? '#f0fdf4' : '#fefce8'}; /* Light green or yellow */
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  border-left: 4px solid ${props => props.approved ? '#22c55e' : '#facc15'}; /* Green or Yellow */
  strong {
    color: #1f2937;
  }
`;

const SubLabel = styled.span`
  font-size: 0.85rem;
  color: #6b7280;
  margin-left: 6px;
`;

const Status = styled.span`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => props.approved ? '#16a34a' : '#ca8a04'}; /* Darker Green or Yellow */
`;

const NotarizeStatus = styled.div`
  display: flex;
  align-items: center;
  font-size: 1rem;
  font-weight: 600;
  color: #10b981; /* Emerald */
  margin-bottom: 12px;
`;

const MetaLine = styled.div`
  font-size: 0.9rem;
  color: #4b5563;
  margin-bottom: 6px;
`;

const DownloadButton = styled(BaseButton)`
  background-color: #6366f1;
  color: white;
  margin-top: 16px;
  width: 100%;
  justify-content: center;
  &:hover {
    background-color: #4338ca;
  }
`;

const SecureInfo = styled.div``;
const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center; // 세로 중앙 정렬 추가
  font-size: 0.9rem;
  color: #4b5563;
  padding: 10px 0;
  border-bottom: 1px solid #f3f4f6;
  &:last-child {
    border-bottom: none;
  }
  span:first-child {
    font-weight: 500;
    color: #374151;
    margin-right: 8px; // 제목과 값 사이 간격
  }
  span:last-child {
    text-align: right; // 값 우측 정렬
    word-break: break-all; // 긴 해시값이 줄바꿈되도록
  }
  /* 클릭 가능한 항목에 대한 스타일 추가 (선택 사항) */
  &.clickable {
    cursor: pointer;
  }
  &.clickable:hover span:last-child {
    text-decoration: underline;
    color: #6366f1; /* 클릭 유도 색상 변경 */
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  font-size: 1.5rem;
  color: #6b7280;
`;

const ErrorContainer = styled.div`
  background-color: #fee2e2; /* Light red */
  color: #b91c1c; /* Dark red */
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
`;

const HashStatus = styled.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;

  &.matching {
    color: #16a34a; // Green
  }
  &.mismatch {
    color: #dc2626; // Red
  }
  &.calculating {
    color: #6b7280; // Gray
  }
`;



const WillDetailPage = () => {
  const [willDetails, setWillDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const { willId } = useParams();
  const navigate = useNavigate();

  const [showFullContentHash, setShowFullContentHash] = useState(false);
  // 클라이언트 측 해시 계산 관련 상태
  const [calculatedClientHash, setCalculatedClientHash] = useState('');
  const [isCalculatingClientHash, setIsCalculatingClientHash] = useState(false);
  const [hashMatchStatus, setHashMatchStatus] = useState(null); // null, 'matching', 'mismatch', 'error'
  const [showFullClientHash, setShowFullClientHash] = useState(false);


  // SHA-256 해시 계산 헬퍼 함수
  async function calculateSHA256(message) {
    if (typeof message !== 'string' || !message) {
      return '';
    }
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    } catch (e) {
      console.error("Error calculating SHA256:", e);
      return "해시 계산 오류";
    }
  }

  useEffect(() => {
    if (!willId) {
      setError("유언장 ID가 제공되지 않았습니다.");
      setIsLoading(false);
      return;
    }
    const fetchWillData = async () => {
      setIsLoading(true);
      setError('');
      setShowFullContentHash(false);
      setShowFullClientHash(false);
      setCalculatedClientHash('');
      setHashMatchStatus(null);
      try {
        const loggedInUsername = sessionStorage.getItem('username');
        if (!loggedInUsername) {
          setError("로그인이 필요합니다. 사용자 정보를 찾을 수 없습니다.");
          setIsLoading(false);
          return;
        }
        const data = await willService.getWillDetails(willId, loggedInUsername);
        setWillDetails(data);
      } catch (err) {
        console.error("Error fetching will details:", err);
        setError(err.response?.data?.message || err.response?.data?.error || err.message || "유언장 상세 정보를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchWillData();
  }, [willId, navigate]);

  // willDetails가 업데이트되면 해시 계산 및 비교
  useEffect(() => {
    if (willDetails && willDetails.originalContent && willDetails.contentHash) {
      setIsCalculatingClientHash(true);
      setHashMatchStatus(null); // 비교 시작 전 상태 초기화
      calculateSHA256(willDetails.originalContent)
        .then(clientHash => {
          setCalculatedClientHash(clientHash);
          if (clientHash && clientHash !== "해시 계산 오류") {
            setHashMatchStatus(clientHash === willDetails.contentHash ? 'matching' : 'mismatch');
          } else {
            setHashMatchStatus('error'); // 해시 계산 자체에서 오류 발생
          }
        })
        .catch(() => {
          setCalculatedClientHash("해시 계산 오류");
          setHashMatchStatus('error');
        })
        .finally(() => {
          setIsCalculatingClientHash(false);
        });
    } else if (willDetails && !willDetails.originalContent) {
        setCalculatedClientHash("원본 내용 없음");
        setHashMatchStatus(null); // 원본 내용이 없으면 비교 불가
    } else {
      // willDetails가 없거나, 필요한 정보가 부족할 경우 초기화
      setCalculatedClientHash('');
      setHashMatchStatus(null);
    }
  }, [willDetails]);


  if (isLoading) { /* ... 로딩 UI ... */ 
    return (
      <LoadingContainer>
        <FaSpinner className="animate-spin" style={{ marginRight: "10px" }} />
        유언장 정보를 불러오는 중...
      </LoadingContainer>
    );
  }
  if (error) { /* ... 에러 UI ... */ 
    return (
      <Container>
        <ErrorContainer>{error}</ErrorContainer>
      </Container>
    );
  }
  if (!willDetails) { /* ... 데이터 없음 UI ... */ 
    return (
      <Container>
        <p>유언장 정보를 찾을 수 없습니다.</p>
      </Container>
    );
  }

  const creationDate = willDetails.createdAt ? new Date(willDetails.createdAt).toLocaleDateString() : 'N/A';
  const modificationDate = willDetails.modifiedAt ? new Date(willDetails.modifiedAt).toLocaleDateString() : creationDate;
  const viewerCount = Array.isArray(willDetails.beneficiaries) ? willDetails.beneficiaries.length : 0;
  const isBlockchainSecured = true; 
  const isEncrypted = true;

  return (
    <Container>
      {/* ... (SummaryCard, LeftColumn 등 기존 JSX는 동일) ... */}
      <SummaryCard>
        <SummaryTop>
          <div>
            <SummaryTitle>{willDetails.title || "제목 없음"}</SummaryTitle>
            {willDetails.notarizationStatus === "Completed" && (
              <SummaryBadge>
                <FaCheckCircle style={{ marginRight: "6px" }} />
                공증 완료
              </SummaryBadge>
            )}
          </div>
          <ButtonGroup>
            <EditButton onClick={() => navigate(`/edit-will/${willId}`)}>
              <FaPen style={{ marginRight: "6px" }} />
              수정하기
            </EditButton>
            <DeleteButton onClick={() => alert("삭제 기능 구현 필요")}>
              <FaTrashAlt style={{ marginRight: "6px" }} />
              삭제하기
            </DeleteButton>
          </ButtonGroup>
        </SummaryTop>
        <SummaryInfoRow>
          <SummaryText>작성일: {creationDate}</SummaryText>
          <Dot>·</Dot>
          <SummaryText>최종 수정일: {modificationDate}</SummaryText>
        </SummaryInfoRow>
        <SummaryMetaRow>
          <MetaBadge>
            <FaUserFriends style={{ marginRight: "6px" }} />
            열람자 {viewerCount}명
          </MetaBadge>
          <MetaBadge>
            <FaShieldAlt style={{ marginRight: "6px" }} />
            {isBlockchainSecured ? "블록체인 원장 기록" : "블록체인 미적용"}
          </MetaBadge>
          <MetaBadge>
            <FaLock style={{ marginRight: "6px" }} />
            {isEncrypted ? "내용 암호화 저장" : "암호화되지 않음"}
          </MetaBadge>
        </SummaryMetaRow>
      </SummaryCard>

      <TwoColumn>
        <LeftColumn>
          <Card>
            <SectionTitle>유언장 내용</SectionTitle>
            <Paragraph as="pre" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}> 
              {willDetails.originalContent || "내용 없음"}
            </Paragraph>
          </Card>

          {willDetails.imageDataUrls && willDetails.imageDataUrls.length > 0 && (
            <Card>
              <SectionTitle>첨부 이미지</SectionTitle>
              <DocList>
                {willDetails.imageDataUrls.map((img, index) => (
                  img.url ? (
                    <DocItem key={img.id || index}>
                      <DocInfo>
                        <FaFileAlt size={16} style={{ marginRight: "8px" }} />
                        <span>{img.fileName || `첨부 이미지 ${index + 1}`}</span>
                      </DocInfo>
                      <DocMeta>
                        <a href={img.url} download={img.fileName || `will_image_${index + 1}.png`}>
                          <FaDownload color="#6366f1" style={{ marginLeft: "8px" }} />
                        </a>
                      </DocMeta>
                    </DocItem>
                  ) : ( 
                    <DocItem key={img.id || index}>
                      <DocInfo style={{color: 'red'}}>
                        <FaFileAlt size={16} style={{ marginRight: "8px" }} />
                        <span>{img.fileName || `첨부 이미지 ${index + 1}`} (오류: {img.error || "로드 실패"})</span>
                      </DocInfo>
                    </DocItem>
                  )
                ))}
              </DocList>
            </Card>
          )}
        </LeftColumn>

        <RightColumn>
           {Array.isArray(willDetails.beneficiaries) && willDetails.beneficiaries.length > 0 && (
             <Card>
              <FlexHeader>
                <SectionTitle>지정 열람자</SectionTitle>
              </FlexHeader>
              {willDetails.beneficiaries.map((beneficiary, index) => (
                <ViewerBox key={index} approved={true}> 
                  <div>
                    <strong>{typeof beneficiary === 'string' ? beneficiary : beneficiary.name || '이름 없음'}</strong> 
                  </div>
                  <Status approved={true}>승인됨</Status>
                </ViewerBox>
              ))}
            </Card>
          )}
          
          {willDetails.notarizationRequested && (
            <Card>
              <SectionTitle>공증 상태</SectionTitle>
              <NotarizeStatus>
                <FaCheckCircle style={{ color: "#10b981", marginRight: "6px" }} />
                <span>{willDetails.notarizationStatus === "Completed" ? "공증 완료" : "공증 진행중/신청됨"}</span>
              </NotarizeStatus>
            </Card>
          )}

          <Card>
            <SectionTitle>보안 정보 (무결성 검증)</SectionTitle>
            <SecureInfo>
              <InfoRow>
                <span>유언장 ID (체인)</span>
                <span>{willDetails.id || 'N/A'}</span>
              </InfoRow>
              <InfoRow
                className={willDetails.originalContent && calculatedClientHash && calculatedClientHash !== "해시 계산 오류" && calculatedClientHash !== "원본 내용 없음" ? "clickable" : ""}
                onClick={() => {
                  if (willDetails.originalContent && calculatedClientHash && calculatedClientHash !== "해시 계산 오류" && calculatedClientHash !== "원본 내용 없음") {
                    setShowFullClientHash(!showFullClientHash);
                  }
                }}
                title={willDetails.originalContent && calculatedClientHash && calculatedClientHash !== "해시 계산 오류" && calculatedClientHash !== "원본 내용 없음" ? (showFullClientHash ? "클릭하여 클라이언트 해시 축약" : "클릭하여 클라이언트 해시 전체 보기") : "원본 내용 해시 (클라이언트 측 계산)"}
              >
                <span>내용 해시 (현재 브라우저)</span>
                <span>
                  {isCalculatingClientHash 
                    ? "계산 중..." 
                    : (calculatedClientHash
                        ? (showFullClientHash ? calculatedClientHash : `${calculatedClientHash.substring(0,10)}...`)
                        : (willDetails.originalContent ? "계산 준비" : "원본 내용 없음")
                      )
                  }
                </span>
              </InfoRow>
              <InfoRow
                className={willDetails.contentHash ? "clickable" : ""}
                onClick={() => {
                  if (willDetails.contentHash) {
                    setShowFullContentHash(!showFullContentHash);
                  }
                }}
                title={willDetails.contentHash ? (showFullContentHash ? "클릭하여 저장된 해시 축약" : "클릭하여 저장된 해시 전체 보기") : "저장된 내용 해시 (블록체인)"}
              >
                <span>내용 해시 (블록체인 기록)</span>
                <span>
                  {willDetails.contentHash
                    ? (showFullContentHash ? willDetails.contentHash : `${willDetails.contentHash.substring(0,10)}...`)
                    : 'N/A'}
                </span>
              </InfoRow>
              <InfoRow>
                <span>해시 일치 여부</span>
                {isCalculatingClientHash ? (
                  <HashStatus className="calculating"><FaSpinner className="animate-spin"/> 확인 중...</HashStatus>
                ) : hashMatchStatus === 'matching' ? (
                  <HashStatus className="matching"><FaCheckCircle /> 일치</HashStatus>
                ) : hashMatchStatus === 'mismatch' ? (
                  <HashStatus className="mismatch"><FaTimesCircle /> 불일치</HashStatus>
                ) : hashMatchStatus === 'error' ? (
                  <HashStatus className="mismatch"><FaTimesCircle /> 계산 오류</HashStatus>
                ) : (
                  <HashStatus><FaQuestionCircle /> 확인 불가</HashStatus>
                )}
              </InfoRow>
              <InfoRow>
                <span>텍스트 DB 참조 ID</span>
                <span>{willDetails.offChainStorageRef || 'N/A'}</span>
              </InfoRow>
              <InfoRow> 
                <span>암호화 방식</span>
                <span>AES-256-GCM</span>
              </InfoRow>
            </SecureInfo>
          </Card>
        </RightColumn>
      </TwoColumn>
    </Container>
  );
};

export default WillDetailPage;