package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ABstore Chaincode implementation
type ABstore struct {
	contractapi.Contract
}

// User 구조체
type User struct {
	Name    string `json:"name"`
	Balance int    `json:"balance"`
}

// Car 구조체
type Car struct {
	CarID   string   `json:"carId"`
	Records []string `json:"records"`
}

// AddCar - 차량 등록
func (t *ABstore) AddCar(ctx contractapi.TransactionContextInterface, carID string) error {
	car := Car{
		CarID:   carID,
		Records: []string{},
	}

	carJSON, err := json.Marshal(car)
	if err != nil {
		return fmt.Errorf("Failed to marshal car data: %s", err)
	}

	err = ctx.GetStub().PutState(carID, carJSON)
	if err != nil {
		return fmt.Errorf("Failed to add car: %s", err)
	}

	return nil
}

func (t *ABstore) GetCar(ctx contractapi.TransactionContextInterface, carID string) (string, error) {
	carBytes, err := ctx.GetStub().GetState(carID)
	if err != nil {
		return "", fmt.Errorf("Failed to get car: %s", err)
	}

	if carBytes == nil {
		return "", fmt.Errorf("Car not found")
	}

	return string(carBytes), nil
}

// AddCarRecord - 차량 수리 기록 등록
func (t *ABstore) AddCarRecord(ctx contractapi.TransactionContextInterface, carID string, record string) error {
	carBytes, err := ctx.GetStub().GetState(carID)
	if err != nil {
		return fmt.Errorf("Failed to get car: %s", err)
	}

	if carBytes == nil {
		return fmt.Errorf("Car not found")
	}

	var car Car
	err = json.Unmarshal(carBytes, &car)
	if err != nil {
		return fmt.Errorf("Failed to unmarshal car data: %s", err)
	}

	// Record 추가
	car.Records = append(car.Records, record)

	// 갱신된 Car 구조체 저장
	carJSON, err := json.Marshal(car)
	if err != nil {
		return fmt.Errorf("Failed to marshal car data: %s", err)
	}

	err = ctx.GetStub().PutState(carID, carJSON)
	if err != nil {
		return fmt.Errorf("Failed to update car record: %s", err)
	}

	return nil
}

// ReceivePoints - 포인트 수령
func (t *ABstore) ReceivePoints(ctx contractapi.TransactionContextInterface, user string, points int) error {
	userBytes, err := ctx.GetStub().GetState(user)
	if err != nil {
		return fmt.Errorf("Failed to get user: %s", err)
	}

	var usr User

	if userBytes == nil {
		usr = User{Name: user, Balance: points}
	} else {
		err = json.Unmarshal(userBytes, &usr)
		if err != nil {
			return fmt.Errorf("Failed to unmarshal user data: %s", err)
		}
		usr.Balance += points
	}

	userJSON, err := json.Marshal(usr)
	if err != nil {
		return fmt.Errorf("Failed to marshal user data: %s", err)
	}

	err = ctx.GetStub().PutState(user, userJSON)
	if err != nil {
		return fmt.Errorf("Failed to update user balance: %s", err)
	}

	return nil
}

// PayPoints - 포인트 사용
func (t *ABstore) PayPoints(ctx contractapi.TransactionContextInterface, user string, points int) error {
	userBytes, err := ctx.GetStub().GetState(user)
	if err != nil {
		return fmt.Errorf("Failed to get user: %s", err)
	}

	if userBytes == nil {
		return fmt.Errorf("User not found")
	}

	var usr User
	err = json.Unmarshal(userBytes, &usr)
	if err != nil {
		return fmt.Errorf("Failed to unmarshal user data: %s", err)
	}

	if usr.Balance < points {
		return fmt.Errorf("Insufficient points")
	}

	usr.Balance -= points

	userJSON, err := json.Marshal(usr)
	if err != nil {
		return fmt.Errorf("Failed to marshal user data: %s", err)
	}

	err = ctx.GetStub().PutState(user, userJSON)
	if err != nil {
		return fmt.Errorf("Failed to update user balance: %s", err)
	}

	return nil
}

func (t *ABstore) CreateUser(ctx contractapi.TransactionContextInterface, userID string, name string) error {
	user := User{
		Name:    name,
		Balance: 0,
	}

	userJSON, err := json.Marshal(user)
	if err != nil {
		return fmt.Errorf("Failed to marshal user data: %s", err)
	}

	err = ctx.GetStub().PutState(userID, userJSON)
	if err != nil {
		return fmt.Errorf("Failed to create user: %s", err)
	}

	return nil
}

// GetUser - 사용자 조회
func (t *ABstore) GetUser(ctx contractapi.TransactionContextInterface, userID string) (string, error) {
	userBytes, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return "", fmt.Errorf("Failed to get user: %s", err)
	}

	if userBytes == nil {
		return "", fmt.Errorf("User not found")
	}

	return string(userBytes), nil
}

func main() {
	cc, err := contractapi.NewChaincode(new(ABstore))
	if err != nil {
		panic(err.Error())
	}

	if err := cc.Start(); err != nil {
		fmt.Printf("Error starting ABstore chaincode: %s", err)
	}
}
