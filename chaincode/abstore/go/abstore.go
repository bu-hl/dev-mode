package main

import (
	"errors"
	"fmt"
	"strconv"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// ABstore implements the chaincode
type ABstore struct {
	contractapi.Contract
}

// Admin key for fee collection (if needed)
const AdminKey = "Admin"

// InitLedger only runs once on chaincode instantiation
func (t *ABstore) InitLedger(ctx contractapi.TransactionContextInterface, A string, Aval int, B string, Bval int) error {
	fmt.Println("Initializing ledger")
	if err := ctx.GetStub().PutState(A, []byte(strconv.Itoa(Aval))); err != nil {
		return err
	}
	if err := ctx.GetStub().PutState(B, []byte(strconv.Itoa(Bval))); err != nil {
		return err
	}
	// Initialize admin balance if you want fees
	return ctx.GetStub().PutState(AdminKey, []byte("0"))
}

// RegisterUser creates a new user with 1 ticket
func (t *ABstore) RegisterUser(ctx contractapi.TransactionContextInterface, userID string) error {
	exists, err := t.UserExists(ctx, userID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("user %s already registered", userID)
	}
	return ctx.GetStub().PutState(userID, []byte("1"))
}

// UserExists checks if a user key exists
func (t *ABstore) UserExists(ctx contractapi.TransactionContextInterface, userID string) (bool, error) {
	data, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return false, err
	}
	return data != nil, nil
}
// 체인코드에 추가
func (t *ABstore) PlusTicket(ctx contractapi.TransactionContextInterface, userID string) error {
    data, err := ctx.GetStub().GetState(userID)
    if err != nil {
        return err
    }
    if data == nil {
        return fmt.Errorf("user %s not found", userID)
    }

    tickets, err := strconv.Atoi(string(data))
    if err != nil {
        return err
    }
    tickets++

    return ctx.GetStub().PutState(userID, []byte(strconv.Itoa(tickets)))
}

// SubmitDraw consumes 1 ticket, stores random & proof on ledger under composite key
func (t *ABstore) SubmitDraw(ctx contractapi.TransactionContextInterface, userID, random, proof string) error {
	// 1) check user exists
	bytes, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return err
	}
	if bytes == nil {
		return fmt.Errorf("user %s not found", userID)
	}
	// 2) parse tickets
	tickets, err := strconv.Atoi(string(bytes))
	if err != nil {
		return err
	}
	if tickets < 1 {
		return errors.New("insufficient tickets")
	}
	// 3) decrement ticket
	tickets--
	if err := ctx.GetStub().PutState(userID, []byte(strconv.Itoa(tickets))); err != nil {
		return err
	}
	// 4) store random & proof together under a composite key
	compositeKey, err := ctx.GetStub().CreateCompositeKey("draw", []string{userID, random})
	if err != nil {
		return err
	}
	record := fmt.Sprintf("{\"random\":\"%s\",\"proof\":\"%s\"}", random, proof)
	return ctx.GetStub().PutState(compositeKey, []byte(record))
}

// GetDrawHistory returns all draws for a user
func (t *ABstore) GetDrawHistory(ctx contractapi.TransactionContextInterface, userID string) ([]string, error) {
	iterator, err := ctx.GetStub().GetStateByPartialCompositeKey("draw", []string{userID})
	if err != nil {
		return nil, err
	}
	defer iterator.Close()

	var results []string
	for iterator.HasNext() {
		item, err := iterator.Next()
		if err != nil {
			return nil, err
		}
		results = append(results, string(item.Value))
	}
	return results, nil
}

// QueryUserTickets returns the current ticket count for a user
func (t *ABstore) QueryUserTickets(ctx contractapi.TransactionContextInterface, userID string) (int, error) {
	bytes, err := ctx.GetStub().GetState(userID)
	if err != nil {
		return 0, err
	}
	if bytes == nil {
		return 0, fmt.Errorf("user %s not found", userID)
	}
	tickets, err := strconv.Atoi(string(bytes))
	if err != nil {
		return 0, err
	}
	return tickets, nil
}
func main() {
	chaincode, err := contractapi.NewChaincode(new(ABstore))
	if err != nil {
		panic(fmt.Sprintf("Error creating ABstore chaincode: %s", err))
	}
	if err := chaincode.Start(); err != nil {
		panic(fmt.Sprintf("Error starting ABstore chaincode: %s", err))
	}
}