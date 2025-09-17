/*
Copyright IBM Corp. 2016 All Rights Reserved.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
var Admin = "Admin"

// 카드 내용 json화할려고 구조체 사용
type WalletInfo struct{
   WalletName string `json:"WalletName"`
   Username string `json:"Username"`
   Password string `json:"Password"`
   Balance int `json:"Balance"`
}



//등록
func (t *ABstore) Init(ctx contractapi.TransactionContextInterface, WalletName string, Username string, Password string) error{
   var err error
   // Initialize the chaincode
   // Write the state to the ledger

   //카드 객체
   wallet := WalletInfo{
      WalletName: WalletName,
      Username: Username,
      Password: Password,
      Balance: 100,
   }

   //json 직렬
   WalletJSON, err := json.Marshal(wallet)
   if err != nil {
      return fmt.Errorf("Failed to marshal JSON: %v", err)
   }

   err = ctx.GetStub().PutState(WalletName, WalletJSON)
   if err != nil {
      return err
   }

   return nil
}

func (t *ABstore) AddBalance(ctx contractapi.TransactionContextInterface, WalletName string, amount int) error {
   amountbytes, err := ctx.GetStub().GetState(WalletName)
   if err != nil {
       return fmt.Errorf("Failed to get state for %s: %v", WalletName, err)
   }
   if amountbytes == nil {
       return fmt.Errorf("Wallet %s does not exist", WalletName)
   }

   var wallet WalletInfo
   err = json.Unmarshal(amountbytes, &wallet)
   if err != nil {
       return fmt.Errorf("invalid wallet data format for %s: %v", WalletName, err)
   }

   wallet.Balance += amount
   fmt.Printf("WalletBalance for %s = %d\n", WalletName, wallet.Balance)

   WalletJSON, err := json.Marshal(wallet)
   if err != nil {
       return fmt.Errorf("Failed to marshal updated card info: %v", err)
   }

   err = ctx.GetStub().PutState(WalletName, WalletJSON)
   if err != nil {
       return fmt.Errorf("Failed to update card info in ledger: %v", err)
   }

   return nil
}



func (t *ABstore) ExchangeBalance(ctx contractapi.TransactionContextInterface, walletName1 string, walletName2 string, 
   amount int ) error {
      
      if amount <= 0 {
         return fmt.Errorf("0원이하는 송금할 수 없습니다")
      }

      //지갑 1 정보 조회
      wallet1JSON, err := ctx.GetStub().GetState(walletName1)
      if err != nil {
         return fmt.Errorf("지갑1 정보조회에 실패! %s: %v", walletName1, err)
      }
      if wallet1JSON == nil {
         return fmt.Errorf("지갑1 %s가 존재하지 않습니다", walletName1)
      }

      var wallet1 WalletInfo
      err = json.Unmarshal(wallet1JSON, &wallet1)
      if err != nil {
         return fmt.Errorf("지갑1 %s 정보 조회에 실패! %v", walletName1, err)
      }

      //지갑 2 정보 조회
      wallet2JSON, err := ctx.GetStub().GetState(walletName2)
      if err != nil {
         return fmt.Errorf("지갑2 정보조회에 실패! %s: %v", walletName2, err)
      }
      if wallet2JSON == nil {
         return fmt.Errorf("지갑2 %s가 존재하지 않습니다", walletName2)
      }
      var wallet2 WalletInfo
      err = json.Unmarshal(wallet2JSON, &wallet2)
      if err != nil {
         return fmt.Errorf("지갑2 %s 정보 조회에 실패! %v", walletName2, err)
      }

      //잔액 확인
      if wallet1.Balance < amount {
         return fmt.Errorf("지갑1 %s의 잔액이 부족합니다 (잔액: %d, 송금액: %d)", walletName1,
          wallet1.Balance, amount)
      }
      if wallet2.Balance < amount {
         return fmt.Errorf("지갑2 %s의 잔액이 부족합니다 (잔액: %d, 송금액: %d)", walletName2, 
         wallet2.Balance, amount)
      }

      //송금액 교환
      wallet1.Balance -= amount
      wallet2.Balance += amount
      

      //지갑 정보 업데이트
      wallet1JSONUpdated, err := json.Marshal(wallet1)
      if err != nil {
         return fmt.Errorf("지갑1 %s 정보 업데이트에 실패! %v", walletName1, err)
      }

      wallet2JSONUpdated, err := json.Marshal(wallet2)
      if err != nil {
         return fmt.Errorf("지갑2 %s 정보 업데이트에 실패! %v", walletName2, err)
      }

      //ledger에 업데이트
      err = ctx.GetStub().PutState(walletName1, wallet1JSONUpdated)
      if err != nil {
         return fmt.Errorf("지갑1 %s 정보 업데이트에 실패! %v", walletName1, err)
      }

      err = ctx.GetStub().PutState(walletName2, wallet2JSONUpdated)
      if err != nil {
         return fmt.Errorf("지갑2 %s 정보 업데이트에 실패! %v", walletName2, err)
      }

      return nil
   }

   // 모든 지갑 정보 조회
func (t *ABstore) QueryAll(ctx contractapi.TransactionContextInterface) ([]WalletInfo, error) {
	// 모든 키-값 쌍을 조회
	iterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("Failed to get state iterator: %v", err)
	}
	defer iterator.Close()

	var wallets []WalletInfo
	// iterator를 순회하며 지갑 정보 수집
	for iterator.HasNext() {
		response, err := iterator.Next()
		if err != nil {
			return nil, fmt.Errorf("Failed to iterate state: %v", err)
		}

		var wallet WalletInfo
		err = json.Unmarshal(response.Value, &wallet)
		if err != nil {
			return nil, fmt.Errorf("Failed to unmarshal wallet data for key %s: %v", response.Key, err)
		}
		wallets = append(wallets, wallet)
	}

	return wallets, nil
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
