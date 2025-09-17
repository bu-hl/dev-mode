import React, { useState, useEffect } from "react"; // useEffect 추가
import styled from "styled-components";
import { FaUpload, FaPlus, FaTrash } from "react-icons/fa"; // FaPlus, FaTrash 아이콘 추가
import { useNavigate } from 'react-router-dom';
import willService from '../services/willService';
import { v4 as uuidv4 } from 'uuid'; // uuid 직접 사용

// Styled-components 정의 (중복 제거 및 필요한 것만 남김)
const Container = styled.div`
  max-width: 960px;
  margin: 40px auto;
  padding: 24px;
`;

const Title = styled.h2`
  text-align: center;
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
  margin-top: 0;
`;

const Subtitle = styled.div`
  text-align: center;
  font-size: 1rem;
  font-weight: 500;
  color: #4b5563;
  margin-bottom: 10px;
  margin-top: 0;
  letter-spacing: -0.01em;
`;

const StepProgress = styled.div`
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  margin-bottom: 48px;
  padding: 0 12px;

  &::before {
    content: "";
    position: absolute;
    top: 18px;
    left: 12px;
    right: 12px;
    height: 4px;
    background: #e5e7eb;
    z-index: 0;
    border-radius: 2px;
  }

  &::after {
    content: "";
    position: absolute;
    top: 18px;
    left: 12px;
    width: calc(((100% - 24px) / 3) * var(--progress)); /* 4단계이므로 3개의 구간 */
    height: 4px;
    background: #6366f1;
    z-index: 1;
    border-radius: 2px;
  }

  .step-item {
    position: relative;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    cursor: default;

    .circle {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background-color: #e5e7eb;
      color: #666;
      font-weight: 700;
      line-height: 36px;
      text-align: center;
      margin-bottom: 8px;
      user-select: none;
    }

    &.active .circle {
      background-color: #6366f1;
      color: white;
    }

    .step-name {
      font-size: 14px;
      color: #666;
      user-select: none;
    }

    &.active .step-name {
      color: #111827;
      font-weight: 700;
    }
  }
`;

const Section = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.04);
`;

const Label = styled.div`
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 24px;
`;

const InlineInputs = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
`;

const Input = styled.input`
  flex: 1;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 14px;
  width: 100%; 
  box-sizing: border-box;
`;

const TextArea = styled.textarea`
  width: 100%;
  height: 200px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  resize: none;
  font-size: 14px;
  box-sizing: border-box;
`;

const UploadButton = styled.label`
  margin-top: 12px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid #6366f1;
  background: transparent;
  color: #6366f1;
  transition: background-color 0.2s, color 0.2s;
  display: inline-block; 

  &:hover {
    background: #6366f1;
    color: white;
  }
`;

const UploadInput = styled.input`
  display: none;
`;

const UploadBoxLabel = styled.label`
  border: 1px dashed #ccc;
  padding: 32px;
  text-align: center;
  color: #777;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 16px;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  svg {
    font-size: 20px;
    margin-bottom: 8px;
  }
`;

const FileNameList = styled.ul`
  margin-top: 12px;
  list-style: none;
  padding-left: 0;
  font-size: 14px;
  color: #444;
`;

const FileNameItem = styled.li`
`;

const FilePreviewArea = styled.div`
  margin-top: 16px;
`;

const PreviewTitle = styled.h4`
  font-size: 15px;
  margin-bottom: 8px;
  color: #333;
`;

const ViewerItem = styled.div`
  background: #f9fafb;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: #111827;
`;

const AddViewerButton = styled.button`
  margin-top: 12px;
  padding: 10px 16px;
  font-size: 14px;
  cursor: pointer;
  border-radius: 8px;
  border: 1px solid #6366f1;
  background: transparent;
  color: #6366f1;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background: #6366f1;
    color: white;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  margin-top: 12px;
  font-size: 14px;
  color: #111827;

  input {
    margin-right: 8px;
  }
`;

const ButtonWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 32px;
  gap: 12px;
`;

const Button = styled.button`
  padding: 12px 20px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-size: 14px;

  &.save {
    background: transparent;
    border: 1px solid #6366f1;
    color: #6366f1;
  }
  &.save:hover {
    background: #6366f1;
    color: white;
  }
  &.submit {
    background: #6366f1;
    color: white;
    border: none;
  }
  &.submit:hover {
    background: #4f46e5;
  }
  &:disabled {
    background-color: #ccc;
    color: #666;
    cursor: not-allowed;
    border-color: #ccc;
  }
  &.submit:disabled:hover {
    background: #ccc;
  }
`;

const ApiMessage = styled.div`
  margin-top: 10px;
  text-align: center;
  font-size: 0.9em;
  &.error {
    color: red;
  }
  &.success {
    color: green;
  }
`;




const WillWritePage = () => {
  const navigate = useNavigate();
  // viewers 상태를 이름과 전화번호를 포함하도록 변경
  const [viewers, setViewers] = useState([]); 
  const [blockchain, setBlockchain] = useState(false);
  const [publicReq, setPublicReq] = useState(false);
  const [imageFilesToUpload, setImageFilesToUpload] = useState([]);
  const [content, setContent] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [willTitle, setWillTitle] = useState("");
  const [testatorDisplayRealName, setTestatorDisplayRealName] = useState("");
  const [sessionUsername, setSessionUsername] = useState("");
  const [isLoadingRealName, setIsLoadingRealName] = useState(true);
  const [apiStatus, setApiStatus] = useState({ loading: false, error: null, data: null });
  const [ocrInProgress, setOcrInProgress] = useState(false);
  const [ocrError, setOcrError] = useState(null);
  const [uploadedFileNames, setUploadedFileNames] = useState([]);

  useEffect(() => {
    const usernameFromSession = sessionStorage.getItem('username');
    if (usernameFromSession) {
      setSessionUsername(usernameFromSession);
      setIsLoadingRealName(true);
      willService.queryByName(usernameFromSession)
        .then(response => {
          setTestatorDisplayRealName(response.data.realName || usernameFromSession);
          setIsLoadingRealName(false);
        })
        .catch(error => {
          console.error("실명 조회 실패:", error);
          setTestatorDisplayRealName(usernameFromSession);
          setIsLoadingRealName(false);
        });
    } else {
      setTestatorDisplayRealName("로그인 필요");
      setIsLoadingRealName(false);
      // navigate('/login'); 
    }
  }, []);

  const handleFileChange = async (e) => {
    const newFiles = Array.from(e.target.files);
    if (newFiles.length > 0) {
      const updatedFilesToUpload = [...imageFilesToUpload, ...newFiles].slice(0, 5); // 최대 5개 파일 제한 (예시)
      const updatedFileNames = updatedFilesToUpload.map(f => f.name);
      setImageFilesToUpload(updatedFilesToUpload);
      setUploadedFileNames(updatedFileNames);

      const fileToProcessForOCR = newFiles[0];
      setOcrInProgress(true);
      setOcrError(null);
      try {
        const response = await willService.extractTextFromImage(fileToProcessForOCR);
        const result = response.data;
        if (result.text !== undefined) {
          setContent(prevContent => prevContent ? `${prevContent}\n${result.text}` : result.text);
          if (result.text.trim() !== "" && currentStep < 2 && willTitle.trim() !== "" && testatorDisplayRealName.trim() !== "" && testatorDisplayRealName !== "로그인 필요") {
            setCurrentStep(2);
          }
        } else {
          throw new Error("OCR API 응답에서 텍스트를 찾을 수 없습니다.");
        }
      } catch (error) {
        console.error("OCR 실패:", error);
        const errorMessage = error.response?.data?.error || error.message || "OCR 처리 중 알 수 없는 오류가 발생했습니다.";
        setOcrError(errorMessage);
      } finally {
        setOcrInProgress(false);
      }
    }
  };

  const handleContentChange = (e) => {
    const value = e.target.value;
    setContent(value);
    if (value.trim() !== "" && currentStep < 2 && willTitle.trim() !== "" && testatorDisplayRealName.trim() !== "" && testatorDisplayRealName !== "로그인 필요") {
      setCurrentStep(2);
    }
  };
  
  const handleTitleChange = (e) => {
    const value = e.target.value;
    setWillTitle(value);
    if (value.trim() !== "" && currentStep < 2 && content.trim() !== "" && testatorDisplayRealName.trim() !== "" && testatorDisplayRealName !== "로그인 필요") {
      setCurrentStep(2);
    }
  };

  // 지정 열람자 추가 함수 수정
  const handleAddViewer = () => {
    // 새 지정 열람자 객체 (이름과 전화번호 필드 포함)
    const newViewer = { id: uuidv4(), name: "", phone: "" };
    setViewers(prev => [...prev, newViewer]); // 기존 배열 뒤에 추가
    if (currentStep < 3 && willTitle.trim() !== "" && content.trim() !== "" && testatorDisplayRealName.trim() !== "" && testatorDisplayRealName !== "로그인 필요") {
      setCurrentStep(3);
    }
  };

  // 지정 열람자 정보 변경 핸들러
  const handleViewerChange = (id, field, value) => {
    setViewers(prevViewers =>
      prevViewers.map(viewer =>
        viewer.id === id ? { ...viewer, [field]: value } : viewer
      )
    );
  };

  // 지정 열람자 삭제 핸들러
  const handleRemoveViewer = (idToRemove) => {
    setViewers(prevViewers => prevViewers.filter(viewer => viewer.id !== idToRemove));
  };


  const handleSubmit = async () => {
    if (!willTitle || !content || !sessionUsername || !testatorDisplayRealName || testatorDisplayRealName === "로그인 필요") {
      setApiStatus({ loading: false, error: "유언장 제목, 내용 및 작성자 정보(로그인 상태)는 필수 항목입니다.", data: null });
      return;
    }
    
    // 지정 열람자 정보 유효성 검사 (이름과 전화번호 모두 입력되었는지)
    for (const viewer of viewers) {
        if (!viewer.name.trim() || !viewer.phone.trim()) {
            setApiStatus({ loading: false, error: "모든 지정 열람자의 이름과 전화번호를 입력해야 합니다.", data: null });
            return;
        }
    }


    if (willTitle.trim() && content.trim() && sessionUsername && currentStep < 4) {
        setCurrentStep(4);
        return; 
    }

    setApiStatus({ loading: true, error: null, data: null });

    const formData = new FormData();
    formData.append('title', willTitle); 
    formData.append('originalContent', content);
    
    // 지정 열람자 정보를 {name, phone} 객체의 배열로 변환하여 전송
    const designatedViewersArray = viewers.map(v => ({ name: v.name, phone: v.phone }));
    formData.append('designatedViewers', JSON.stringify(designatedViewersArray)); // 필드명 변경 및 데이터 형식 변경

    formData.append('testatorId', sessionUsername);
    // formData.append('blockchainEnabled', blockchain); // 서버에서 처리 방식에 따라 boolean 또는 문자열
    // formData.append('notarizationRequested', publicReq); // 서버에서 처리 방식에 따라 boolean 또는 문자열

    if (imageFilesToUpload.length > 0) {
      imageFilesToUpload.forEach((file) => {
        formData.append('imageFiles', file, file.name);
      });
    }
    
    try {
      let response;
      // 이미지 유무에 따라 다른 API 호출 (기존 로직 유지)
      // textWillData 객체에도 designatedViewers 포함되도록 수정
      if (imageFilesToUpload.length > 0) {
        response = await willService.registerWillWithImage(formData); // registerWillWithImage API가 FormData를 받고 designatedViewers를 처리해야 함
      } else {
        const textWillData = {
          title: willTitle,
          originalContent: content,
          designatedViewers: designatedViewersArray, // 필드명 변경 및 데이터 형식 변경
          testatorId: sessionUsername,
          // blockchainEnabled: blockchain,
          // notarizationRequested: publicReq,
        };
        response = await willService.registerWill(textWillData); // registerWill API가 이 구조를 받아야 함
      }
      
      const responseData = response.data || {};
      setApiStatus({ loading: false, error: null, data: responseData });
      console.log("등록 성공:", responseData);
      const successMessage = responseData.message || "유언장이 성공적으로 등록되었습니다.";
      navigate('/success', { state: { message: successMessage, details: responseData } });

    } catch (error) {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || "유언장 등록 중 알 수 없는 오류가 발생했습니다.";
      setApiStatus({ loading: false, error: errorMessage, data: null });
      console.error("등록 실패:", error);
    }
  };
  
  const isSubmitDisabled = () => {
    if (apiStatus.loading) return true;
    if (!willTitle.trim() || !content.trim() || !sessionUsername || testatorDisplayRealName === "로그인 필요") {
        return true;
    }
    // 지정 열람자 정보 유효성 검사 추가 (모든 열람자의 이름과 전화번호가 채워졌는지)
    for (const viewer of viewers) {
        if (!viewer.name.trim() || !viewer.phone.trim()) {
            return true; // 하나라도 비어있으면 비활성화
        }
    }
    return false; 
  };

  return (
    <Container>
      <Title>디지털 유언장 작성</Title>
      <Subtitle>작성 진행 상태</Subtitle>
      <StepProgress style={{ "--progress": currentStep - 1 }}>
        <div className={`step-item ${currentStep >= 1 ? "active" : ""}`}>
          <div className="circle">1</div>
          <span className="step-name">기본 정보</span>
        </div>
        <div className={`step-item ${currentStep >= 2 ? "active" : ""}`}>
          <div className="circle">2</div>
          <span className="step-name">내용 작성</span>
        </div>
        <div className={`step-item ${currentStep >= 3 ? "active" : ""}`}>
          <div className="circle">3</div>
          <span className="step-name">지정 열람자</span> {/* 단계 이름 변경 */}
        </div>
        <div className={`step-item ${currentStep >= 4 ? "active" : ""}`}>
          <div className="circle">4</div>
          <span className="step-name">최종 확인</span>
        </div>
      </StepProgress>

      <Section>
        <Label>기본 정보</Label>
        <InlineInputs>
          <Input placeholder="유언장 제목" value={willTitle} onChange={handleTitleChange} />
          <Input
            placeholder="작성자 이름 (자동 입력)"
            value={isLoadingRealName ? "실명 로딩 중..." : testatorDisplayRealName}
            readOnly
          />
        </InlineInputs>
      </Section>

      <Section>
        <Label>유언장 내용</Label>
        <TextArea
          placeholder="유언장 내용을 작성해주세요..."
          value={content}
          onChange={handleContentChange}
        />
      </Section>
      
      <Section>
        <Label>자필 문서 스캔 / 유언장 첨부 이미지 (선택사항, 최대 5장)</Label>
        <UploadBoxLabel htmlFor="handwritten-upload">
          <FaUpload />
          <div>
            이곳에 파일을 끌어다 놓거나 클릭하여 업로드하세요
            <br />
            (선택된 모든 이미지가 첨부됩니다. OCR은 새로 추가된 첫 번째 파일로 진행됩니다.)
            <br />
            지원 형식: JPG, PNG, WEBP 등 이미지 파일
          </div>
          <UploadInput
            id="handwritten-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
        </UploadBoxLabel>
        <UploadButton htmlFor="handwritten-upload">
          📎 문서/이미지 업로드하기
        </UploadButton>
        {ocrInProgress && <ApiMessage style={{ marginTop: '10px', textAlign: 'center' }}>첫 번째 이미지 OCR 처리 중...</ApiMessage>}
        {ocrError && <ApiMessage className="error" style={{ marginTop: '10px', textAlign: 'center' }}>OCR 오류: {ocrError}</ApiMessage>}
        
        {uploadedFileNames.length > 0 && (
          <FilePreviewArea>
            <PreviewTitle>선택된 파일:</PreviewTitle>
            <FileNameList>
              {uploadedFileNames.map((fileName, index) => (
                <FileNameItem key={index}>{fileName}</FileNameItem>
              ))}
            </FileNameList>
          </FilePreviewArea>
        )}
      </Section>
      
      <Section>
        <Label>지정 열람자 정보</Label> {/* 레이블 변경 */}
        {viewers.map((viewer, index) => (
          // 각 지정 열람자 입력 UI (별도의 스타일 컴포넌트로 분리 가능)
          <div key={viewer.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', gap: '10px' }}>
            <Input
              type="text"
              placeholder="열람자 이름"
              value={viewer.name}
              onChange={(e) => handleViewerChange(viewer.id, 'name', e.target.value)}
              style={{ flexGrow: 1 }} 
            />
            <Input
              type="tel"
              placeholder="열람자 전화번호"
              value={viewer.phone}
              onChange={(e) => handleViewerChange(viewer.id, 'phone', e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <Button 
                onClick={() => handleRemoveViewer(viewer.id)} 
                className="remove" /* 스타일 적용 위해 className 추가 가능 */
                style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              <FaTrash /> 삭제
            </Button>
          </div>
        ))}
        <AddViewerButton onClick={handleAddViewer}>
          <FaPlus style={{ marginRight: '5px' }} />
          지정 열람자 추가
        </AddViewerButton>
      </Section>

      <Section>
        <Label>고급 설정 (선택사항)</Label> {/* 레이블 변경 */}
        <CheckboxLabel>
          <input type="checkbox" checked={blockchain} onChange={(e) => setBlockchain(e.target.checked)} />
          블록체인 원장에 기록 (추천)
        </CheckboxLabel>
        <CheckboxLabel>
          <input type="checkbox" checked={publicReq} onChange={(e) => setPublicReq(e.target.checked)} />
          디지털 공증 신청 (별도 비용 발생 가능)
        </CheckboxLabel>
      </Section>

      <ButtonWrap>
        <Button className="save" onClick={() => alert("임시 저장 기능 구현 필요")}>임시 저장</Button> {/* 임시 저장 버튼에 기능 연결 필요 */}
        <Button
            className="submit"
            onClick={handleSubmit}
            disabled={isSubmitDisabled()}
        >
          {apiStatus.loading ? "처리 중..." : (currentStep < 4 ? "내용 검토 및 최종 확인" : "작성 완료 및 제출")}
        </Button>
      </ButtonWrap>

      {apiStatus.error && <ApiMessage className="error" >오류: {apiStatus.error}</ApiMessage>}
    </Container>
  );
};

export default WillWritePage;

