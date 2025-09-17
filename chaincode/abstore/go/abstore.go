package main

import (
	"encoding/json"
	"fmt"
	"time"
	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ABstore Chaincode implementation
type ABstore struct {
	contractapi.Contract
}

// ImageMetadata 구조체: 각 이미지의 메타데이터를 저장
type ImageMetadata struct {
	ImageHash        string `json:"imageHash"`
	ImageOffChainRef string `json:"imageOffChainRef"`
	FileName         string `json:"fileName"`
}

// ViewerIdentity 구조체: 지정 열람자의 이름과 전화번호를 저장
type ViewerIdentity struct {
	Name  string `json:"name"`
	Phone string `json:"phone"`
}

// Will defines the structure for a digital will.
type Will struct {
	ID                 string           `json:"id"`
	TestatorID         string           `json:"testatorId"` // 유언 작성자의 시스템 username
	Title              string           `json:"title"`
	ContentHash        string           `json:"contentHash"`
	OffChainStorageRef string           `json:"offChainStorageRef"`
	DesignatedViewers  []ViewerIdentity `json:"designatedViewers"` // 필드 타입 및 JSON 태그 변경
	CreatedAt          string           `json:"createdAt"`
	Images             []ImageMetadata  `json:"images"`
	Status             string           `json:"status"`
	TransactionID      string           `json:"transactionId"`
	ObjectType         string           `json:"docType"`
}

// InitLedger is called when the chaincode is instantiated or upgraded.
func (s *ABstore) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("ABstore: InitLedger invoked")
	return nil
}

// RegisterWill creates a new digital will on the ledger.
func (s *ABstore) RegisterWill(ctx contractapi.TransactionContextInterface,
	id string,
	testatorID string,
	title string,
	contentHash string,
	offChainStorageRef string,
	designatedViewersJSON string, // [{"name":"홍길동", "phone":"010-1234-5678"},...] 형태의 JSON 문자열
	imagesJSON string) (string, error) {

	fmt.Printf("ABstore.RegisterWill: Attempting to register will ID '%s' for TestatorID '%s', Title '%s'\n", id, testatorID, title)
	fmt.Printf("DesignatedViewersJSON: '%s'\n", designatedViewersJSON)
	fmt.Printf("ABstore.RegisterWill: Attempting to register will ID '%s' for TestatorID '%s', Title '%s'\n", id, testatorID, title)
	fmt.Printf("ContentHash (first 10): '%s...'\n", firstN(contentHash, 10))
	fmt.Printf("OffChainStorageRef: '%s'\n", offChainStorageRef)
	fmt.Printf("ImagesJSON: '%s'\n", imagesJSON)

	if id == "" || testatorID == "" || title == "" || contentHash == "" || offChainStorageRef == "" {
		return "", fmt.Errorf("all required fields (id, testatorID, title, contentHash, offChainStorageRef) cannot be empty")
	}

	existingWillBytes, err := ctx.GetStub().GetState(id)
	if err != nil {
		return "", fmt.Errorf("failed to read from world state for ID '%s': %w", id, err)
	}
	if existingWillBytes != nil {
		return "", fmt.Errorf("will with ID '%s' already exists", id)
	}

	var designatedViewers []ViewerIdentity // <--- 이 타입이어야 함
	if designatedViewersJSON != "" && designatedViewersJSON != "[]" { // 비어있거나 "[]"가 아닐 때만 처리
		err = json.Unmarshal([]byte(designatedViewersJSON), &designatedViewers) // `[]ViewerIdentity`로 언마샬링
		if err != nil {
			return "", fmt.Errorf("failed to unmarshal designated viewers JSON string '%s': %w", designatedViewersJSON, err)
		}
	}
	var images []ImageMetadata
	if imagesJSON != "" && imagesJSON != "[]" {
		err = json.Unmarshal([]byte(imagesJSON), &images)
		if err != nil {
			return "", fmt.Errorf("failed to unmarshal images JSON string. Input was: '%s'. Error: %w", imagesJSON, err)
		}
	}

	txID := ctx.GetStub().GetTxID()

	will := Will{
		ID:                 id,
		TestatorID:         testatorID,
		Title:              title,
		ContentHash:        contentHash,
		OffChainStorageRef: offChainStorageRef,
		DesignatedViewers:  designatedViewers, // 변경된 타입의 데이터 할당
		CreatedAt:          time.Now().UTC().Format(time.RFC3339),
		Images:             images,
		Status:             "REGISTERED",
		TransactionID:      txID,
		ObjectType:         "Will",
	}

	willJSON, err := json.Marshal(will)
	if err != nil {
		return "", fmt.Errorf("failed to marshal will struct to JSON for ID '%s': %w", id, err)
	}

	err = ctx.GetStub().PutState(id, willJSON)
	if err != nil {
		return "", fmt.Errorf("failed to put will '%s' to world state: %w", id, err)
	}

	fmt.Printf("ABstore.RegisterWill: Successfully registered will ID '%s' for testator '%s'. TransactionID: %s\n", id, testatorID, txID)
	return fmt.Sprintf("Will '%s' registered successfully. Transaction ID: %s", id, txID), nil
}

// GetWillDetails retrieves a specific will by its ID from the ledger.
// Access is granted if the requester is the Testator or a matching DesignatedViewer (Name and Phone).
func (s *ABstore) GetWillDetails(ctx contractapi.TransactionContextInterface,
	willID string,
	requesterUsername string,           // 유언 작성자인지 확인할 때 사용 (시스템 username)
	viewerIdentityJSON string) (*Will, error) { // 조회 시도하는 사람의 {"name":"...", "phone":"..."} JSON

	fmt.Printf("ABstore.GetWillDetails: Attempting to retrieve will with ID '%s' by requesterUsername '%s'\n", willID, requesterUsername)
	fmt.Printf("ViewerIdentityJSON for designated viewer check: '%s'\n", viewerIdentityJSON)


	if willID == "" {
		return nil, fmt.Errorf("willID cannot be empty")
	}
	if requesterUsername == "" {
		return nil, fmt.Errorf("requesterUsername cannot be empty")
	}
	// viewerIdentityJSON은 작성자가 아닌 경우에만 필수
	// if viewerIdentityJSON == "" { ... } // 이 검사는 아래 로직에서 처리

	willJSON, err := ctx.GetStub().GetState(willID)
	if err != nil {
		return nil, fmt.Errorf("failed to read will '%s' from world state: %w", willID, err)
	}
	if willJSON == nil {
		return nil, fmt.Errorf("will '%s' does not exist", willID)
	}

	var will Will
	err = json.Unmarshal(willJSON, &will)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal JSON for will '%s': %w", willID, err)
	}

	isTestator := will.TestatorID == requesterUsername
	isDesignatedViewer := false

	if !isTestator {
		if viewerIdentityJSON == "" {
			return nil, fmt.Errorf("viewerIdentityJSON (name and phone for designated viewer check) cannot be empty when requester is not the testator")
		}
		var requestingViewer ViewerIdentity
		err = json.Unmarshal([]byte(viewerIdentityJSON), &requestingViewer)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal viewerIdentityJSON '%s': %w", viewerIdentityJSON, err)
		}
		if requestingViewer.Name == "" || requestingViewer.Phone == "" {
			return nil, fmt.Errorf("viewerIdentityJSON must contain non-empty 'name' and 'phone' fields")
		}

		for _, designatedViewer := range will.DesignatedViewers {
			if designatedViewer.Name == requestingViewer.Name && designatedViewer.Phone == requestingViewer.Phone {
				isDesignatedViewer = true
				break
			}
		}
	}

	if !isTestator && !isDesignatedViewer {
		return nil, fmt.Errorf("access denied: user '%s' is neither the testator ('%s') nor a matching designated viewer of will '%s'", requesterUsername, will.TestatorID, willID)
	}

	if will.Images == nil {
		will.Images = make([]ImageMetadata, 0)
	}
	if will.DesignatedViewers == nil { // 추가: DesignatedViewers도 nil이면 빈 슬라이스로 초기화
		will.DesignatedViewers = make([]ViewerIdentity, 0)
	}


	fmt.Printf("ABstore.GetWillDetails: Successfully retrieved will ID '%s' (User: '%s', Role: %s) Images count: %d, DesignatedViewers count: %d\n",
		willID,
		requesterUsername,
		func() string { if isTestator { return "Testator" } else { return "Designated Viewer" } }(),
		len(will.Images),
		len(will.DesignatedViewers))
	return &will, nil
}

// GetMyWills retrieves all wills created by the calling user (testator).
func (s *ABstore) GetMyWills(ctx contractapi.TransactionContextInterface, usernameAsTestatorID string) ([]*Will, error) {
	fmt.Printf("ABstore.GetMyWills: Retrieving all wills for testator (username) '%s'\n", usernameAsTestatorID)

	if usernameAsTestatorID == "" {
		return nil, fmt.Errorf("usernameAsTestatorID (for TestatorID) cannot be empty")
	}

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %w", err)
	}
	defer resultsIterator.Close()

	var myWills []*Will
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			fmt.Printf("Warning: Failed to get next state from iterator for key '%s': %s. Skipping.\n", queryResponse.Key, err.Error())
			continue
		}

		var will Will
		if queryResponse.Value == nil {
			fmt.Printf("Warning: Empty value for key '%s'. Skipping.\n", queryResponse.Key)
			continue
		}

		if errUnmarshal := json.Unmarshal(queryResponse.Value, &will); errUnmarshal != nil {
			fmt.Printf("Warning: Failed to unmarshal data for key '%s' into Will object: %s. Value (first 50 bytes): '%s...'. Skipping.\n", queryResponse.Key, errUnmarshal.Error(), firstN(string(queryResponse.Value), 50) )
			continue
		}

		if will.ObjectType == "Will" && will.TestatorID == usernameAsTestatorID {
			if will.Images == nil {
				will.Images = make([]ImageMetadata, 0)
			}
			if will.DesignatedViewers == nil { // DesignatedViewers nil 체크 추가
				will.DesignatedViewers = make([]ViewerIdentity, 0)
			}
			myWills = append(myWills, &will)
		}
	}

	if len(myWills) == 0 {
		fmt.Printf("ABstore.GetMyWills: No wills found for testator (username) '%s'\n", usernameAsTestatorID)
	} else {
		fmt.Printf("ABstore.GetMyWills: Found %d wills for testator (username) '%s'\n", len(myWills), usernameAsTestatorID)
	}
	return myWills, nil
}

// GetWillsViewableByMe retrieves all wills where the requester is listed as a designated viewer.
func (s *ABstore) GetWillsViewableByMe(ctx contractapi.TransactionContextInterface, viewerIdentityJSON string) ([]*Will, error) {
	fmt.Printf("ABstore.GetWillsViewableByMe: Attempting to retrieve wills viewable by viewer: %s\n", viewerIdentityJSON)

	if viewerIdentityJSON == "" {
		return nil, fmt.Errorf("viewerIdentityJSON (name and phone for designated viewer check) cannot be empty")
	}

	var requestingViewer ViewerIdentity
	err := json.Unmarshal([]byte(viewerIdentityJSON), &requestingViewer)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal viewerIdentityJSON '%s': %w", viewerIdentityJSON, err)
	}
	if requestingViewer.Name == "" || requestingViewer.Phone == "" {
		return nil, fmt.Errorf("viewerIdentityJSON must contain non-empty 'name' and 'phone' fields for the requesting viewer")
	}

	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("failed to get state by range: %w", err)
	}
	defer resultsIterator.Close()

	var viewableWills []*Will
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			fmt.Printf("Warning: Failed to get next state from iterator for key '%s': %s. Skipping.\n", queryResponse.Key, err.Error())
			continue
		}

		var will Will
		if queryResponse.Value == nil {
			fmt.Printf("Warning: Empty value for key '%s'. Skipping.\n", queryResponse.Key)
			continue
		}

		if errUnmarshal := json.Unmarshal(queryResponse.Value, &will); errUnmarshal != nil {
			fmt.Printf("Warning: Failed to unmarshal data for key '%s' into Will object: %s. Value (first 50 bytes): '%s...'. Skipping.\n", queryResponse.Key, errUnmarshal.Error(), firstN(string(queryResponse.Value), 50))
			continue
		}

		// Only consider documents of type "Will"
		if will.ObjectType == "Will" {
			for _, designatedViewer := range will.DesignatedViewers {
				if designatedViewer.Name == requestingViewer.Name && designatedViewer.Phone == requestingViewer.Phone {
					// Ensure Images and DesignatedViewers are not nil
					if will.Images == nil {
						will.Images = make([]ImageMetadata, 0)
					}
					if will.DesignatedViewers == nil {
						will.DesignatedViewers = make([]ViewerIdentity, 0)
					}
					viewableWills = append(viewableWills, &will)
					break // Found this viewer in this will, no need to check further for this will
				}
			}
		}
	}

	if len(viewableWills) == 0 {
		fmt.Printf("ABstore.GetWillsViewableByMe: No wills found where viewer '%s' (Name: %s, Phone: %s) is a designated viewer.\n", viewerIdentityJSON, requestingViewer.Name, requestingViewer.Phone)
	} else {
		fmt.Printf("ABstore.GetWillsViewableByMe: Found %d wills where viewer '%s' (Name: %s, Phone: %s) is a designated viewer.\n", len(viewableWills), viewerIdentityJSON, requestingViewer.Name, requestingViewer.Phone)
	}

	return viewableWills, nil
}
// Helper function to get the first N characters of a string (for logging long strings)
func firstN(s string, n int) string {
	if len(s) > n {
		return s[:n]
	}
	return s
}


func (s *ABstore) UpdateWillStatusByAdmin(ctx contractapi.TransactionContextInterface, willID string, newStatus string) error {
	fmt.Printf("ABstore.UpdateWillStatusByAdmin: Attempting to update status of will ID '%s' to '%s'\n", willID, newStatus)

	// 1. (중요) 관리자 접근 제어 로직
	// 실제 운영 환경에서는 호출자의 ID를 확인하여 관리자 권한이 있는지 검사해야 합니다.
	// 예를 들어, 클라이언트 ID의 MSPID를 확인하거나 특정 속성을 확인할 수 있습니다.
	// clientMSPID, err := ctx.GetClientIdentity().GetMSPID()
	// if err != nil {
	// 	 return fmt.Errorf("failed to get client's MSPID: %w", err)
	// }
	// if clientMSPID != "AdminOrgMSP" { // "AdminOrgMSP"는 예시이며 실제 관리자 조직의 MSPID로 변경해야 합니다.
	// 	 return fmt.Errorf("caller with MSPID '%s' is not authorized to update will status. Required MSPID: 'AdminOrgMSP'", clientMSPID)
	// }
	// 또는 클라이언트 ID에 특정 admin 속성이 있는지 확인할 수도 있습니다.
	// isAdmin, _, err := ctx.GetClientIdentity().GetAttributeValue("hf.Type") // 예시 속성
	// if err != nil || !isAdmin || hfTypeValue != "admin"
	// ...

	// 여기서는 시연을 위해 간단히 로그만 남기고 통과합니다.
	fmt.Println("ABstore.UpdateWillStatusByAdmin: Admin check placeholder. Ensure to implement proper access control.")


	if willID == "" {
		return fmt.Errorf("willID cannot be empty")
	}
	if newStatus == "" {
		return fmt.Errorf("newStatus cannot be empty")
	}

	// 2. 새로운 상태 값 유효성 검사 (선택 사항이지만 권장)
	// 예: 허용되는 상태 값 목록 정의
	allowedStatuses := map[string]bool{
		"REGISTERED": true,
		"ACTIVE":     true, // 예시: 유언 효력 발생
		"EXPIRED":    true, // 예시: 유언 만료
		"EXECUTED":   true, // 예시: 유언 집행 완료
		"REVOKED":    true, // 예시: 유언 철회
		// 필요에 따라 다른 상태 추가
	}
	if !allowedStatuses[newStatus] {
		return fmt.Errorf("invalid newStatus: '%s'. Allowed statuses are: REGISTERED, ACTIVE, EXPIRED, EXECUTED, REVOKED", newStatus)
	}


	willJSON, err := ctx.GetStub().GetState(willID)
	if err != nil {
		return fmt.Errorf("failed to read will '%s' from world state: %w", willID, err)
	}
	if willJSON == nil {
		return fmt.Errorf("will '%s' does not exist", willID)
	}

	var will Will
	err = json.Unmarshal(willJSON, &will)
	if err != nil {
		return fmt.Errorf("failed to unmarshal JSON for will '%s': %w", willID, err)
	}

	// 3. 상태 업데이트
	fmt.Printf("ABstore.UpdateWillStatusByAdmin: Current status of will '%s' is '%s'. Updating to '%s'.\n", willID, will.Status, newStatus)
	will.Status = newStatus
	// 필요하다면 상태 변경 시간 등을 기록할 수 있습니다 (예: will.LastStatusUpdate = time.Now().UTC().Format(time.RFC3339))

	updatedWillJSON, err := json.Marshal(will)
	if err != nil {
		return fmt.Errorf("failed to marshal updated will struct for ID '%s': %w", willID, err)
	}

	err = ctx.GetStub().PutState(willID, updatedWillJSON)
	if err != nil {
		return fmt.Errorf("failed to put updated will '%s' to world state: %w", willID, err)
	}

	fmt.Printf("ABstore.UpdateWillStatusByAdmin: Successfully updated status of will ID '%s' to '%s'\n", willID, newStatus)
	return nil
}


// main function starts the chaincode in the container environment.
func main() {
	chaincode, err := contractapi.NewChaincode(new(ABstore))
	if err != nil {
		fmt.Printf("Error creating ABstore chaincode: %s\n", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting ABstore chaincode: %s\n", err.Error())
	}
}