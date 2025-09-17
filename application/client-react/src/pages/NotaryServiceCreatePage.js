// application/client-react/src/pages/NotaryServiceCreatePage.js
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux"; // showToastMessage를 위해 유지
import { showToastMessage } from "../../features/common/uiSlice";
import notaryService from "../../services/notaryService"; // notaryService 임포트

// ... (styled-components 정의는 이전과 동일하게 유지)
const Container = styled.div`
  max-width: 850px;
  margin: 60px auto 40px;
  padding: 0 20px;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 32px;
  text-align: center;
`;

const FormWrapper = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 40px 32px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
  gap: 28px;
`;

const GridContainer = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 14px;
  color: #333;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  height: 120px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
`;

const TagContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

const Tag = styled.button`
  background-color: ${({ selected }) => (selected ? "#574bff" : "#f1f3f5")};
  color: ${({ selected }) => (selected ? "#fff" : "#333")};
  border: none;
  border-radius: 20px;
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.3s, color 0.3s;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
  width: 100%;
  background: #fff;
`;

const SubmitButton = styled.button`
  background-color: #48e0c7;
  color: #fff;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-weight: bold;
  font-size: 16px;
  cursor: pointer;
  &:hover {
    background-color: #2ccab4;
  }
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const NOTARY_TAG_OPTIONS = [
  "유언공증", "부동산공증", "계약서공증", "출생공증", "혼인공증", 
  "이혼공증", "상속공증", "위임장", "사서증서", "번역공증", "공증경력10년↑",
];

const NotaryServiceCreatePage = () => {
  const dispatch = useDispatch();
  const loggedInUsername = sessionStorage.getItem('username'); 
  const [isLoading, setIsLoading] = useState(false); // 전체 로딩 (데이터 가져오기 + 제출)
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 로딩
  const [isInitialDataLoaded, setIsInitialDataLoaded] = useState(false);

  const [form, setForm] = useState({
    companyNameReadOnly: "", 
    contact: "", 
    description: "",
    tags: [],
    servicePhone: "", 
    servicePrice: "", 
    visitServicePrice: "", 
  });

  useEffect(() => {
    const fetchInitialNotaryData = async () => {
      if (loggedInUsername) {
        setIsLoading(true); // 초기 데이터 로딩 시작
        try {
          // notaryService.getOwnNotaryDetails()는 백엔드에서 Users.company_name과 NotaryDetails를 함께 가져옴
          const data = await notaryService.getOwnNotaryDetails(loggedInUsername); // loggedInUsername 전달
          
          if (data) { // data가 null이 아닐 때 (기존 정보가 있거나, Users 정보라도 있을 때)
            setForm({
              companyNameReadOnly: data.userCompanyName || "", // Users 테이블의 회사명
              contact: data.company_phone || "",
              description: data.description || "",
              tags: data.tags || [],
              servicePhone: data.consultation_phone || data.userPhoneNumber || "", // NotaryDetails 우선, 없으면 Users의 전화번호
              servicePrice: data.phone_consultation_fee !== null && data.phone_consultation_fee !== undefined ? String(data.phone_consultation_fee) : "",
              visitServicePrice: data.visit_consultation_fee !== null && data.visit_consultation_fee !== undefined ? String(data.visit_consultation_fee) : "",
            });
            if (data.message && !data.notary_detail_id && data.userCompanyName) { // 상세 정보는 없지만 사용자 정보는 있는 경우
                dispatch(showToastMessage({ message: data.message, status: "info" }));
            }
          } else if (loggedInUsername) { // 사용자는 로그인했지만, getOwnNotaryDetails가 null 반환 (404 등)
             // 이 경우, Users 정보만이라도 따로 가져와서 companyNameReadOnly라도 채울 수 있도록 시도
             // (getOwnNotaryDetails가 Users 정보도 못가져왔다면 이 로직은 불필요)
             console.warn("getOwnNotaryDetails returned null, notary might not be fully registered or user not found.");
             // 필요시 사용자 기본 정보(Users 테이블)만 가져오는 API 호출
             // 예: const userInfo = await userService.getUserProfile();
             // setForm(prev => ({...prev, companyNameReadOnly: userInfo.companyName, servicePhone: userInfo.phone}));
             dispatch(showToastMessage({ message: "공증인 상세 정보를 불러올 수 없습니다. 처음 등록하는 경우 정보를 입력해주세요.", status: "info" }));
          }
        } catch (error) {
          console.error("공증인 정보 로딩 중 오류:", error);
          dispatch(showToastMessage({ message: error.message || "정보를 불러오는 중 오류가 발생했습니다.", status: "error" }));
        } finally {
          setIsLoading(false); // 초기 데이터 로딩 완료
          setIsInitialDataLoaded(true);
        }
      } else {
        setIsInitialDataLoaded(true); // 사용자가 없으면 바로 로드 완료 처리
      }
    };

    fetchInitialNotaryData();
  }, [loggedInUsername, dispatch]);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagClick = (tag) => {
    setForm((prev) => {
      const isSelected = prev.tags.includes(tag);
      let newTags;
      if (isSelected) {
        newTags = prev.tags.filter((t) => t !== tag);
      } else {
        if (prev.tags.length < 3) {
          newTags = [...prev.tags, tag];
        } else {
          dispatch(showToastMessage({ message: "태그는 최대 3개까지 선택 가능합니다.", status: "warning" }));
          newTags = prev.tags;
        }
      }
      return { ...prev, tags: newTags };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loggedInUsername) { 
        dispatch(showToastMessage({ message: "로그인이 필요합니다.", status: "error" }));
        return;
    }
    // 간단한 필수 필드 유효성 검사 (예시)
    if (!form.contact || !form.description || form.tags.length === 0) {
        dispatch(showToastMessage({ message: "회사 대표 전화번호, 상세 소개, 태그는 필수 입력 항목입니다.", status: "warning" }));
        return;
    }

    setIsSubmitting(true); // 제출 중 로딩 상태 활성화

    const detailsToSubmit = {
      company_phone: form.contact,
      consultation_phone: form.servicePhone,
      phone_consultation_fee: form.servicePrice ? parseInt(form.servicePrice, 10) : null,
      visit_consultation_fee: form.visitServicePrice ? parseInt(form.visitServicePrice, 10) : null,
      tags: form.tags,
      description: form.description,
    };
    console.log('[CLIENT NotaryServiceCreatePage] Data to submit:', detailsToSubmit); // <<--- 이 로그 확인

    try {
      // API 호출 시 userId는 백엔드에서 세션/토큰을 통해 식별하므로, 프론트에서 보낼 필요 없음
      const response = await notaryService.upsertOwnNotaryDetails(detailsToSubmit, loggedInUsername); // loggedInUsername 전달
      dispatch(
        showToastMessage({
          message: response.message || "공증 서비스 정보가 성공적으로 저장되었습니다.",
          status: "success",
        })
      );
    } catch (error) {
      dispatch(
        showToastMessage({
          // error 객체가 백엔드에서 보낸 { message: "..." } 형태일 수 있음
          message: error.message || (typeof error === 'string' ? error : "정보 저장 중 오류가 발생했습니다."),
          status: "error",
        })
      );
    } finally {
      setIsSubmitting(false); // 제출 중 로딩 상태 비활성화
    }
  };
  
  // 초기 데이터 로딩 중이거나, 로그인되지 않았을 때의 UI
  if (!isInitialDataLoaded && loggedInUsername) {
    return (
      <Container>
        <Title>내 공증 서비스 정보 관리</Title>
        <p style={{textAlign: 'center'}}>공증인 정보를 불러오는 중입니다...</p>
      </Container>
    );
  }

  if (!loggedInUsername) {
    return (
      <Container>
        <Title>내 공증 서비스 정보 관리</Title>
        <p style={{textAlign: 'center'}}>로그인이 필요한 서비스입니다. 로그인 후 다시 시도해주세요.</p>
      </Container>
    );
  }

  // 데이터 로딩 완료 후 폼 렌더링
  return (
    <Container>
      <Title>내 공증 서비스 정보 관리</Title>
      <FormWrapper as="form" onSubmit={handleSubmit}>
        <GridContainer>
          <FormGroup>
            <Label htmlFor="companyNameReadOnly">회사명 (등록 정보)</Label>
            <Input
              id="companyNameReadOnly"
              name="companyNameReadOnly"
              value={form.companyNameReadOnly}
              readOnly 
              style={{backgroundColor: '#f1f3f5', color: '#555'}}
              placeholder="회사 정보가 없습니다."
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="contact">사무실 대표 전화번호</Label>
            <Input
              id="contact"
              name="contact"
              type="tel"
              value={form.contact}
              onChange={handleChange}
              placeholder="예: 02-1234-5678"
              required
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="servicePhone">개인 또는 상담용 전화번호</Label>
            <Input
              id="servicePhone"
              name="servicePhone"
              type="tel"
              value={form.servicePhone}
              placeholder="사무실 번호와 다를 경우 입력"
              onChange={handleChange}
            />
          </FormGroup>

          <FormGroup>
            <Label htmlFor="servicePrice">전화 상담 비용 (30분 기준)</Label>
            <Select
              id="servicePrice"
              name="servicePrice"
              value={form.servicePrice}
              onChange={handleChange}
            >
              <option value="">비용 선택 또는 해당 없음</option>
              {[0, 10000, 20000, 30000, 40000, 50000].map((price) => (
                <option key={price} value={price}>
                  {price === 0 ? "무료" : `${price.toLocaleString()}원`}
                </option>
              ))}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label htmlFor="visitServicePrice">방문 상담 비용 (1시간 기준)</Label>
            <Select
              id="visitServicePrice"
              name="visitServicePrice"
              value={form.visitServicePrice}
              onChange={handleChange}
            >
              <option value="">비용 선택 또는 해당 없음</option>
              {[0, 50000, 70000, 100000].map(
                (price) => (
                  <option key={price} value={price}>
                    {price === 0 ? "무료" : `${price.toLocaleString()}원`}
                  </option>
                )
              )}
            </Select>
          </FormGroup>
        </GridContainer>

        <FormGroup>
          <Label>전문 분야 태그 (최대 3개 선택)</Label>
          <TagContainer>
            {NOTARY_TAG_OPTIONS.map((tag) => (
              <Tag
                type="button" 
                key={tag}
                selected={form.tags.includes(tag)}
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </Tag>
            ))}
          </TagContainer>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="description">공증인 및 서비스 상세 소개</Label>
          <TextArea
            id="description"
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="공증인의 경력, 주요 취급 업무, 사무실 위치, 상담 가능 시간 등 상세 정보를 입력해주세요. (최소 10자 이상)"
            rows={5}
            minLength={10} // 간단한 HTML5 유효성 검사
          />
        </FormGroup>

        <SubmitButton type="submit" disabled={isLoading || isSubmitting}>
          {isSubmitting ? "저장 중..." : "내 서비스 정보 저장하기"}
        </SubmitButton>
      </FormWrapper>
    </Container>
  );
};

export default NotaryServiceCreatePage;