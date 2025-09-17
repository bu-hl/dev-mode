// application/client-react/src/pages/NotaryServicePage.js
import React, { useState, useEffect } from "react"; // useState, useEffect 임포트
import styled from "styled-components";
import {
  FaPhoneAlt,
  FaCommentDots,
  FaPlus,
  FaHandPointer,
  FaLightbulb,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux"; // useDispatch 임포트
import notaryService from "../../services/notaryService"; // notaryService 임포트
import { showToastMessage } from "../../features/common/uiSlice"; // 토스트 메시지용

const Container = styled.div`
  max-width: 850px;
  margin: 60px auto 40px;
  padding: 0 20px;
`;

const Header = styled.div`
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 24px;
`;

const NotaryCard = styled.div`
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 24px;
  margin: 28px 0 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
`;
const TopSection = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const ProfileImage = styled.img`
  width: 80px;
  height: 80px;
  border-radius: 50%;
`;

const Info = styled.div`
  flex: 1;
`;

const Name = styled.div`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 6px;
`;

const Tags = styled.div`
  margin-bottom: 8px;
  font-size: 13px;
  color: #666;
`;

const Description = styled.div`
  font-size: 14px;
  color: #444;
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 16px;
`;

const FilledButtonPrimary = styled.button`
  background-color: #e0e7ff;
  color: #3b4cca;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #3b4cca;
    color: #fff;
  }
`;

const FilledButtonSecondary = styled.button`
  background-color: #e0f0ff;
  color: #1c5d99;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #1c5d99;
    color: #fff;
  }
`;

const QuickIcons = styled.div`
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: #666;

  .label {
    font-size: 14px;
    font-weight: bold;
    margin-right: 8px;
  }
`;

const CircleIcon = styled.div`
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #f1f3f5;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #333;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: #dee2e6;
  }
`;

const CreateServiceButton = styled.button`
  background: transparent;
  color: #574bff;
  font-weight: 600;
  border: 2px solid #574bff;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  float: right;
  margin-top: -8px;

  &:hover {
    background: #574bff;
    color: #fff;
  }
`;

const NotaryServicePage = () => {
  const user = useSelector((state) => state.user?.user); // 상세 사용자 정보 접근
  const isNotary = user?.userType === "NOTARY";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [promotions, setPromotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPromotions = async () => {
      setIsLoading(true);
      try {
        const data = await notaryService.getAllPublicNotaryPromotions();
        setPromotions(data || []); // 데이터가 null일 경우 빈 배열로 초기화
      } catch (error) {
        console.error("공증인 목록 로딩 실패:", error);
        dispatch(showToastMessage({ message: error.message || "공증인 목록을 불러오는데 실패했습니다.", status: "error" }));
        setPromotions([]); // 오류 발생 시 빈 배열
      } finally {
        setIsLoading(false);
      }
    };

    fetchPromotions();
  }, [dispatch]);

  if (isLoading) {
    return (
      <Container>
        <Header>공증인 목록</Header>
        <p style={{ textAlign: "center", marginTop: "40px" }}>
          공증인 목록을 불러오는 중입니다...
        </p>
      </Container>
    );
  }

  return (
    <Container>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Header>공증인 목록</Header>
        {isNotary && (
          <CreateServiceButton
            onClick={() => navigate("/notary-service/create")}
          >
            <FaPlus /> 내 공증 서비스 관리
          </CreateServiceButton>
        )}
      </div>

      {promotions.length === 0 && !isLoading && (
        <p style={{ textAlign: "center", marginTop: "40px" }}>
          등록된 공증인 서비스가 없습니다.
        </p>
      )}

      {promotions.map((promo) => (
        <NotaryCard key={promo.userId || promo.promotionId}> {/* 고유한 key 사용 */}
          <TopSection>
            <ProfileSection>
              {/* 백엔드에서 profile_image_url 필드를 추가하고 데이터를 넣었다면 사용 */}
              <LargeProfileImage 
                src={promo.profile_image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(promo.userName || 'N')}&background=random&size=100`} 
                alt={`${promo.userName} 프로필`}
              />
            </ProfileSection>
            <CardContent>
              {/* <TagRow>
                {promo.special_tags?.includes("예약준수") && <><FaHandPointer style={{ color: "#f7b500" }} /><Tag>예약준수</Tag></>}
                {promo.special_tags?.includes("해결사") && <><FaLightbulb style={{ color: "#f7b500" }} /><Tag>해결사</Tag></>}
              </TagRow> */}
              {/* special_tags는 새 스키마에 없으므로 일단 주석 처리, 필요시 NotaryPromotions에 추가 */}
              <Name>{promo.userName || "이름 없음"}</Name>
              <SubInfo>{promo.userCompanyName || "회사 정보 없음"}</SubInfo>
              <Description>
                {promo.description || "소개글이 아직 없습니다."}
              </Description>
              <HashTags>
                {Array.isArray(promo.tags) && promo.tags.map((tag, index) => (
                  <HashTag key={`${tag}-${index}`}>#{tag}</HashTag>
                ))}
              </HashTags>
              <QuickIcons>
                <span className="label">간편 문의</span>
                {promo.company_phone && (
                  <CircleIcon onClick={() => window.open(`tel:${promo.company_phone}`)} title={`사무실: ${promo.company_phone}`}>
                    <FaPhoneAlt />
                  </CircleIcon>
                )}
                {promo.consultation_phone && (
                   <CircleIcon onClick={() => window.open(`tel:${promo.consultation_phone}`)} title={`상담: ${promo.consultation_phone}`}>
                    <FaCommentDots /> {/* 아이콘은 FaCommentDots 대신 다른 전화 아이콘을 쓰거나, FaPhoneSlash등으로 구분 가능*/}
                  </CircleIcon>
                )}
              </QuickIcons>
            </CardContent>
          </TopSection>
          <ConsultBox>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", justifyContent: "center", gap: '16px' }}>
              <ConsultRow disabled={promo.phone_consultation_fee === null}>
                <ConsultLabel>전화상담</ConsultLabel>
                <ConsultPrice>
                  {promo.phone_consultation_fee !== null 
                    ? (promo.phone_consultation_fee === 0 ? "무료" : `${Number(promo.phone_consultation_fee).toLocaleString()}원`) 
                    : "제공안함"}
                </ConsultPrice>
              </ConsultRow>
              <div
                style={{
                  height: "32px",
                  width: "1px",
                  backgroundColor: "#ccc",
                  margin: "0 12px", // 간격 조정
                }}
                className="divider-vertical"
              />
              <ConsultRow disabled={promo.visit_consultation_fee === null}>
                <ConsultLabel>방문상담</ConsultLabel>
                <ConsultPrice>
                  {promo.visit_consultation_fee !== null 
                    ? (promo.visit_consultation_fee === 0 ? "무료" : `${Number(promo.visit_consultation_fee).toLocaleString()}원`) 
                    : "제공안함"}
                </ConsultPrice>
              </ConsultRow>
            </div>
            <ActionButtonsWrapper>
              <ActionButtons>
                {/* 상세 페이지가 있다면 해당 경로로, 없다면 다른 액션 (예: 바로 전화걸기, 문의폼 등) */}
                <FilledButtonPrimary 
                  onClick={() => {
                    // 상세 페이지로 이동하거나 다른 액션 수행
                    // navigate(`/notary/promotion/${promo.userId}`); 
                    if(promo.company_phone) window.open(`tel:${promo.company_phone}`);
                    else if(promo.consultation_phone) window.open(`tel:${promo.consultation_phone}`);
                    else dispatch(showToastMessage({message: "연락처 정보가 없습니다.", status: "info"}));
                  }}
                >
                  상담 바로 연결
                </FilledButtonPrimary>
              </ActionButtons>
            </ActionButtonsWrapper>
          </ConsultBox>
        </NotaryCard>
      ))}
    </Container>
  );
};

// Styled-components for new NotaryCard layout
const ProfileSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding-right: 0px;
`;

const LargeProfileImage = styled.img`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
`;

const CardContent = styled.div`
  flex: 1;
`;

const TagRow = styled.div`
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 6px;
  color: #f7b500;
  font-weight: 600;
`;

const Tag = styled.span`
  display: inline-block;
`;

const SubInfo = styled.div`
  font-size: 14px;
  color: #777;
  margin-bottom: 6px;
`;

const HashTags = styled.div`
  display: flex;
  gap: 6px;
  margin: 8px 0;
`;

const HashTag = styled.span`
  background: #f1f3f5;
  color: #333;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
`;

const ConsultBox = styled.div`
  background: #f8f9fa;
  padding: 20px;
  border-radius: 12px;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
`;

const ConsultRow = styled.div`
  display: flex;
  flex-direction: column;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
`;

const ConsultLabel = styled.div`
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 4px;
`;

const ConsultPrice = styled.div`
  font-size: 14px;
`;

const ActionButtonsWrapper = styled.div`
  margin-top: -8px;
`;

export default NotaryServicePage;
