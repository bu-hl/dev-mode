// 1. abstore.go (대출 기능만 남긴 최종 버전)

package main

import (
	"encoding/json"
	"fmt"
	"strconv"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// Wallet 구조체
type Wallet struct {
	Address     string `json:"address"`
	Balance     int    `json:"balance"`
	CreatedAt   int64  `json:"createdAt"`
}

// LoanRequest 구조체 수정
type LoanRequest struct {
	ID           string `json:"id"`
	PoolID       string `json:"poolId"`
	Lender       string `json:"lender"`      // 대출자
	Borrower     string `json:"borrower"`    // 차입자
	Amount       int    `json:"amount"`      // 대출금액
	DurationDays int    `json:"durationDays"` // 대출기간
	InterestRate int    `json:"interestRate"` // 이자율 (%)
	Status       string `json:"status"`      // Pending/Active/Denied/Repaid/Overdue
	StartTime    int64  `json:"startTime"`
	EndTime      int64  `json:"endTime"`
}

// Pool 구조체 
type Pool struct {
	ID            string         `json:"id"`
	Name          string         `json:"name"`
	MinDeposit    int            `json:"minDeposit"`
	InterestRate  int            `json:"interestRate"`
	StartTime     int64          `json:"startTime"`
	EndTime       int64          `json:"endTime"`
	TotalDeposit  int            `json:"totalDeposit"`
	TotalInterest int            `json:"totalInterest"`
	Status        string         `json:"status"`
	Participants  []string       `json:"participants"`
	Weights       map[string]float64 `json:"weights"`
}


// 체인코드 구조체
type LoanContract struct {
	contractapi.Contract
}

// 지갑 생성
func (t *LoanContract) CreateWallet(ctx contractapi.TransactionContextInterface, address string, initialBalance string) error {
	exists, err := t.WalletExists(ctx, address)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("wallet %s already exists", address)
	}

	// 초기 잔액을 정수로 변환
	balance := 0
	if initialBalance != "" {
		balance, err = strconv.Atoi(initialBalance)
		if err != nil {
			return fmt.Errorf("invalid initial balance: %v", err)
		}
	}

	wallet := Wallet{
		Address:   address,
		Balance:   balance,
		CreatedAt: time.Now().Unix(),
	}

	walletJSON, err := json.Marshal(wallet)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(address, walletJSON)
}

// 지갑 잔액 조회
func (t *LoanContract) GetWalletBalance(ctx contractapi.TransactionContextInterface, address string) (int, error) {
	walletJSON, err := ctx.GetStub().GetState(address)
	if err != nil || walletJSON == nil {
		return 0, fmt.Errorf("wallet %s does not exist", address)
	}

	var wallet Wallet
	err = json.Unmarshal(walletJSON, &wallet)
	if err != nil {
		return 0, err
	}

	return wallet.Balance, nil
}

// 대출 요청 생성 (수정)
func (t *LoanContract) CreateLoanRequest(ctx contractapi.TransactionContextInterface, id, lender, borrower string, amount, durationDays, interestRate int) error {
	exists, err := t.LoanRequestExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("loan request %s already exists", id)
	}

	// 대출자 잔액 확인
	lenderBalance, err := t.GetWalletBalance(ctx, lender)
	if err != nil {
		return err
	}
	if lenderBalance < amount {
		return fmt.Errorf("insufficient balance for lender %s", lender)
	}

	loan := LoanRequest{
		ID:           id,
		Lender:       lender,
		Borrower:     borrower,
		Amount:       amount,
		DurationDays: durationDays,
		InterestRate: interestRate,
		Status:       "Pending",
		StartTime:    0,
		EndTime:      0,
	}

	loanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, loanJSON)
}

// 대출 승인 (수정)
func (t *LoanContract) ApproveLoanRequest(ctx contractapi.TransactionContextInterface, id string) error {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}

	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}

	if loan.Status != "Pending" {
		return fmt.Errorf("loan request %s is not pending", id)
	}

	// 대출자 잔액 차감
	lenderWalletJSON, err := ctx.GetStub().GetState(loan.Lender)
	if err != nil {
		return err
	}
	var lenderWallet Wallet
	err = json.Unmarshal(lenderWalletJSON, &lenderWallet)
	if err != nil {
		return err
	}
	lenderWallet.Balance -= loan.Amount
	lenderWalletJSON, err = json.Marshal(lenderWallet)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.Lender, lenderWalletJSON)
	if err != nil {
		return err
	}

	// 차입자 잔액 증가
	borrowerWalletJSON, err := ctx.GetStub().GetState(loan.Borrower)
	if err != nil {
		return err
	}
	var borrowerWallet Wallet
	err = json.Unmarshal(borrowerWalletJSON, &borrowerWallet)
	if err != nil {
		return err
	}
	borrowerWallet.Balance += loan.Amount
	borrowerWalletJSON, err = json.Marshal(borrowerWallet)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.Borrower, borrowerWalletJSON)
	if err != nil {
		return err
	}

	// 대출 상태 업데이트
	loan.Status = "Active"
	loan.StartTime = time.Now().Unix()
	loan.EndTime = time.Now().AddDate(0, 0, loan.DurationDays).Unix()

	updatedLoanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedLoanJSON)
}

// 대출 거절
func (t *LoanContract) DenyLoanRequest(ctx contractapi.TransactionContextInterface, id string) error {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}

	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}

	if loan.Status != "Pending" {
		return fmt.Errorf("loan request %s is not pending", id)
	}

	loan.Status = "Denied"
	updatedLoanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedLoanJSON)
}

// 대출 상환
func (t *LoanContract) RepayLoan(ctx contractapi.TransactionContextInterface, id string) error {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}

	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}

	if loan.Status != "Active" {
		return fmt.Errorf("loan request %s is not active", id)
	}

	// 이자 계산
	interest := (loan.Amount * loan.InterestRate * loan.DurationDays) / (365 * 100)
	totalAmount := loan.Amount + interest

	// 차입자 잔액 확인
	borrowerWalletJSON, err := ctx.GetStub().GetState(loan.Borrower)
	if err != nil {
		return err
	}
	var borrowerWallet Wallet
	err = json.Unmarshal(borrowerWalletJSON, &borrowerWallet)
	if err != nil {
		return err
	}
	if borrowerWallet.Balance < totalAmount {
		return fmt.Errorf("insufficient balance for borrower %s", loan.Borrower)
	}

	// 차입자 잔액 차감
	borrowerWallet.Balance -= totalAmount
	borrowerWalletJSON, err = json.Marshal(borrowerWallet)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.Borrower, borrowerWalletJSON)
	if err != nil {
		return err
	}

	// 대출자 잔액 증가
	lenderWalletJSON, err := ctx.GetStub().GetState(loan.Lender)
	if err != nil {
		return err
	}
	var lenderWallet Wallet
	err = json.Unmarshal(lenderWalletJSON, &lenderWallet)
	if err != nil {
		return err
	}
	lenderWallet.Balance += totalAmount
	lenderWalletJSON, err = json.Marshal(lenderWallet)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.Lender, lenderWalletJSON)
	if err != nil {
		return err
	}

	// 대출 상태 업데이트
	loan.Status = "Repaid"
	updatedLoanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedLoanJSON)
}

// 대출 요청 삭제
func (t *LoanContract) DeleteLoanRequest(ctx contractapi.TransactionContextInterface, id string) error {
	exists, err := t.LoanRequestExists(ctx, id)
	if err != nil {
		return err
	}
	if !exists {
		return fmt.Errorf("loan request %s does not exist", id)
	}
	return ctx.GetStub().DelState(id)
}

// 대출 요청 수정
func (t *LoanContract) UpdateLoanRequest(ctx contractapi.TransactionContextInterface, id string, newAmount, newDurationDays int) error {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}

	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}

	if loan.Status != "Pending" {
		return fmt.Errorf("cannot update loan request %s because it is not pending", id)
	}

	loan.Amount = newAmount
	loan.DurationDays = newDurationDays

	updatedLoanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, updatedLoanJSON)
}

// 단일 대출 요청 조회
func (t *LoanContract) QueryLoanRequest(ctx contractapi.TransactionContextInterface, id string) (*LoanRequest, error) {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return nil, fmt.Errorf("loan request %s does not exist", id)
	}

	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return nil, err
	}

	return &loan, nil
}

// 전체 대출 요청 조회
func (t *LoanContract) QueryAllLoanRequests(ctx contractapi.TransactionContextInterface) ([]*LoanRequest, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var loans []*LoanRequest
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		// 대출 요청인지 확인
		var loan LoanRequest
		err = json.Unmarshal(queryResponse.Value, &loan)
		if err == nil && loan.ID != "" {  // ID가 있는 경우에만 대출 요청으로 간주
			loans = append(loans, &loan)
		}
	}
	return loans, nil
}

// 대출 요청 존재 여부
func (t *LoanContract) LoanRequestExists(ctx contractapi.TransactionContextInterface, id string) (bool, error) {
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return false, err
	}
	return loanJSON != nil, nil
}

// 지갑 존재 여부
func (t *LoanContract) WalletExists(ctx contractapi.TransactionContextInterface, address string) (bool, error) {
	walletJSON, err := ctx.GetStub().GetState(address)
	if err != nil {
		return false, err
	}
	return walletJSON != nil, nil
}

// 풀 생성 함수
func (t *LoanContract) CreatePool(ctx contractapi.TransactionContextInterface, id string, name string, minDeposit int, interestRate int, durationMonths int) error {
	exists, err := ctx.GetStub().GetState(id)
	if err != nil {
		return fmt.Errorf("failed to check pool existence: %v", err)
	}
	if exists != nil {
		return fmt.Errorf("pool with ID %s already exists", id)
	}

	if interestRate > 5 {
		return fmt.Errorf("interest rate must be 5%% or less")
	}

	//new Date(초)는 ms 단위를 기대하지만,우리는 Go에서 초 단위를 보냈기 때문
	now := time.Now().Unix() * 1000
	end := time.Now().AddDate(0, durationMonths, 0).Unix() * 1000

	pool := Pool{
		ID:            id,
		Name:          name,
		MinDeposit:    minDeposit,
		InterestRate:  interestRate,
		StartTime:     now,
		EndTime:       end,
		TotalDeposit:  0,
		Participants:  []string{},
		Weights:       make(map[string]float64), // 수정됨
		Status:        "Open",
		TotalInterest: 0,
	}

	poolJSON, err := json.Marshal(pool)
	if err != nil {
		return fmt.Errorf("failed to marshal pool: %v", err)
	}

	return ctx.GetStub().PutState(id, poolJSON)
}

// 풀 조회
func (t *LoanContract) QueryPool(ctx contractapi.TransactionContextInterface, id string) (*Pool, error) {
	poolJSON, err := ctx.GetStub().GetState(id)
	if err != nil {
		return nil, fmt.Errorf("failed to read pool %s: %v", id, err)
	}
	if poolJSON == nil {
		return nil, fmt.Errorf("pool %s does not exist", id)
	}

	var pool Pool
	err = json.Unmarshal(poolJSON, &pool)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal pool %s: %v", id, err)
	}

	return &pool, nil
}


// 모든 풀 조회
func (t *LoanContract) QueryAllPools(ctx contractapi.TransactionContextInterface) ([]*Pool, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var pools []*Pool
	for resultsIterator.HasNext() {
		queryResponse, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var pool Pool
		err = json.Unmarshal(queryResponse.Value, &pool)
		if err == nil && pool.ID != "" {
			pools = append(pools, &pool)
		}
	}

	return pools, nil
}



// JoinPool 함수 – 사용자가 Pool에 예치 참여
func (t *LoanContract) JoinPool(ctx contractapi.TransactionContextInterface, poolID string, userAddress string, depositAmount int) error {
	poolJSON, err := ctx.GetStub().GetState(poolID)
	if err != nil || poolJSON == nil {
		return fmt.Errorf("failed to get pool: %v", err)
	}

	var pool Pool
	err = json.Unmarshal(poolJSON, &pool)
	if err != nil {
		return fmt.Errorf("failed to unmarshal pool: %v", err)
	}

	// 가중치 계산
	weight := float64(depositAmount)
	pool.TotalDeposit += depositAmount
	pool.Weights[userAddress] += weight
	pool.Participants = append(pool.Participants, userAddress)

	updatedJSON, err := json.Marshal(pool)
	if err != nil {
		return fmt.Errorf("failed to marshal updated pool: %v", err)
	}

	return ctx.GetStub().PutState(poolID, updatedJSON)
}


// CreateLoanRequestFromPool - Pool 자금으로 대출 요청 생성
func (t *LoanContract) CreateLoanRequestFromPool(ctx contractapi.TransactionContextInterface, id, poolID, borrower string, amount, durationDays int) error {
	// Pool 존재 확인
	poolJSON, err := ctx.GetStub().GetState(poolID)
	if err != nil || poolJSON == nil {
		return fmt.Errorf("pool %s does not exist", poolID)
	}
	var pool Pool
	err = json.Unmarshal(poolJSON, &pool)
	if err != nil {
		return err
	}

	// Pool 상태 확인
	if pool.Status != "Closed" {
		return fmt.Errorf("pool %s is not ready for lending (status: %s)", poolID, pool.Status)
	}

	// Pool 잔액 확인
	if pool.TotalDeposit < amount {
		return fmt.Errorf("not enough funds in pool %s", poolID)
	}

	// 대출 ID 중복 확인
	exists, err := t.LoanRequestExists(ctx, id)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("loan request %s already exists", id)
	}

	// 대출 요청 생성
	loan := LoanRequest{
		ID:           id,
		PoolID:       poolID,
		Lender:       poolID, // Lender는 Pool로 처리
		Borrower:     borrower,
		Amount:       amount,
		DurationDays: durationDays,
		InterestRate: pool.InterestRate,
		Status:       "Pending",
		StartTime:    0,
		EndTime:      0,
	}

	loanJSON, err := json.Marshal(loan)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, loanJSON)
}

// ApproveLoanRequestFromPool - Pool 자금으로 대출 승인
func (t *LoanContract) ApproveLoanRequestFromPool(ctx contractapi.TransactionContextInterface, id string) error {
	// 대출 요청 조회
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}
	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}

	if loan.Status != "Pending" {
		return fmt.Errorf("loan %s is not pending", id)
	}

	// Pool 조회
	poolJSON, err := ctx.GetStub().GetState(loan.PoolID)
	if err != nil || poolJSON == nil {
		return fmt.Errorf("pool %s does not exist", loan.PoolID)
	}
	var pool Pool
	err = json.Unmarshal(poolJSON, &pool)
	if err != nil {
		return err
	}

	if pool.TotalDeposit < loan.Amount {
		return fmt.Errorf("pool %s has insufficient funds", loan.PoolID)
	}

	// Pool 자금 차감
	pool.TotalDeposit -= loan.Amount

	// 차입자 지갑 증가
	borrowerWalletJSON, err := ctx.GetStub().GetState(loan.Borrower)
	if err != nil || borrowerWalletJSON == nil {
		return fmt.Errorf("borrower wallet %s does not exist", loan.Borrower)
	}
	var borrowerWallet Wallet
	err = json.Unmarshal(borrowerWalletJSON, &borrowerWallet)
	if err != nil {
		return err
	}
	borrowerWallet.Balance += loan.Amount

	// 대출 상태 변경
	loan.Status = "Active"
	loan.StartTime = time.Now().Unix()
	loan.EndTime = time.Now().AddDate(0, 0, loan.DurationDays).Unix()

	// 상태 저장
	poolJSON, err = json.Marshal(pool)
	if err != nil {
		return err
	}
	borrowerWalletJSON, err = json.Marshal(borrowerWallet)
	if err != nil {
		return err
	}
	loanJSON, err = json.Marshal(loan)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(loan.PoolID, poolJSON)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.Borrower, borrowerWalletJSON)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, loanJSON)
}

// RepayLoanToPool - 풀 기반 대출 상환 및 이자 누적
func (t *LoanContract) RepayLoanToPool(ctx contractapi.TransactionContextInterface, id string) error {
	// 대출 요청 조회
	loanJSON, err := ctx.GetStub().GetState(id)
	if err != nil || loanJSON == nil {
		return fmt.Errorf("loan request %s does not exist", id)
	}
	var loan LoanRequest
	err = json.Unmarshal(loanJSON, &loan)
	if err != nil {
		return err
	}
	if loan.Status != "Active" {
		return fmt.Errorf("loan %s is not active", id)
	}

	// 이자 계산
	interest := (loan.Amount * loan.InterestRate * loan.DurationDays) / (365 * 100)
	totalAmount := loan.Amount + interest

	// 차입자 지갑 차감
	borrowerWalletJSON, err := ctx.GetStub().GetState(loan.Borrower)
	if err != nil || borrowerWalletJSON == nil {
		return fmt.Errorf("borrower wallet %s does not exist", loan.Borrower)
	}
	var borrowerWallet Wallet
	err = json.Unmarshal(borrowerWalletJSON, &borrowerWallet)
	if err != nil {
		return err
	}
	if borrowerWallet.Balance < totalAmount {
		return fmt.Errorf("insufficient balance for repayment")
	}
	borrowerWallet.Balance -= totalAmount

	// Pool 조회 및 이자 누적
	poolJSON, err := ctx.GetStub().GetState(loan.PoolID)
	if err != nil || poolJSON == nil {
		return fmt.Errorf("pool %s does not exist", loan.PoolID)
	}
	var pool Pool
	err = json.Unmarshal(poolJSON, &pool)
	if err != nil {
		return err
	}
	pool.TotalDeposit += loan.Amount
	pool.TotalInterest += interest

	// 대출 상태 갱신
	loan.Status = "Repaid"

	// 상태 저장
	loanJSON, err = json.Marshal(loan)
	if err != nil {
		return err
	}
	borrowerWalletJSON, err = json.Marshal(borrowerWallet)
	if err != nil {
		return err
	}
	poolJSON, err = json.Marshal(pool)
	if err != nil {
		return err
	}

	err = ctx.GetStub().PutState(loan.Borrower, borrowerWalletJSON)
	if err != nil {
		return err
	}
	err = ctx.GetStub().PutState(loan.PoolID, poolJSON)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(id, loanJSON)
}

// QueryMyLoans - 로그인한 유저의 대출 요청만 조회
func (t *LoanContract) QueryMyLoans(ctx contractapi.TransactionContextInterface, userAddress string) ([]*LoanRequest, error) {
    // 전체 키 범위 스캔
    iter, err := ctx.GetStub().GetStateByRange("", "")
    if err != nil {
        return nil, err
    }
    defer iter.Close()

    var result []*LoanRequest
    for iter.HasNext() {
        kv, err := iter.Next()
        if err != nil {
            return nil, err
        }
        var loan LoanRequest
        if err := json.Unmarshal(kv.Value, &loan); err != nil {
            continue
        }
        // lender나 borrower가 userAddress인 것만
        if loan.Lender == userAddress || loan.Borrower == userAddress {
            result = append(result, &loan)
        }
    }
    return result, nil
}

func main() {
	cc, err := contractapi.NewChaincode(new(LoanContract))
	if err != nil {
		panic(err.Error())
	}

	if err := cc.Start(); err != nil {
		fmt.Printf("Error starting LoanContract chaincode: %s", err)
	}
}