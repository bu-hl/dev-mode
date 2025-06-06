package main

import (
	"encoding/json"
	"fmt"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// NFT 구조체 정의
type NFT struct {
	TokenID  string `json:"tokenId"`
	Owner    string `json:"owner"`
	Metadata string `json:"metadata"`
	Price    int    `json:"price"`
	ForSale  bool   `json:"forSale"`
	Bidder   string `json:"bidder,omitempty"`
	BidPrice int    `json:"bidPrice,omitempty"`
}

// ABstore 스마트 컨트랙트
type ABstore struct {
	contractapi.Contract
}

// NFT 여부확인
func (s *ABstore) NFTExists(ctx contractapi.TransactionContextInterface, tokenId string) (bool, error) {
	nftBytes, err := ctx.GetStub().GetState(tokenId)
	if err != nil {
		return false, fmt.Errorf("GetState 실패: %v", err)
	}
	return nftBytes != nil, nil
}

func (s *ABstore) MintNFT(ctx contractapi.TransactionContextInterface, tokenId, owner, metadata string, price int) error {
	exists, err := s.NFTExists(ctx, tokenId)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("NFT %s 이미 존재합니다", tokenId)
	}

	nft := NFT{
		TokenID:  tokenId,
		Owner:    owner,
		Metadata: metadata,
		Price:    price,
		ForSale:  false,
	}

	nftBytes, err := json.Marshal(nft)
	if err != nil {
		return fmt.Errorf("JSON 직렬화 실패: %v", err)
	}

	return ctx.GetStub().PutState(tokenId, nftBytes)
}

func (s *ABstore) ReadNFT(ctx contractapi.TransactionContextInterface, tokenId string) (*NFT, error) {
	nftBytes, err := ctx.GetStub().GetState(tokenId)
	if err != nil {
		return nil, fmt.Errorf("조회 실패: %v", err)
	}
	if nftBytes == nil {
		return nil, fmt.Errorf("NFT %s 존재하지 않음", tokenId)
	}

	var nft NFT
	err = json.Unmarshal(nftBytes, &nft)
	if err != nil {
		return nil, fmt.Errorf("JSON 파싱 실패: %v", err)
	}

	return &nft, nil
}

func (s *ABstore) TransferNFT(ctx contractapi.TransactionContextInterface, tokenId, newOwner string) error {
	nft, err := s.ReadNFT(ctx, tokenId)
	if err != nil {
		return err
	}

	nft.Owner = newOwner
	nft.ForSale = false
	nft.Bidder = ""
	nft.BidPrice = 0

	nftBytes, err := json.Marshal(nft)
	if err != nil {
		return fmt.Errorf("JSON 직렬화 실패: %v", err)
	}

	return ctx.GetStub().PutState(tokenId, nftBytes)
}

func (s *ABstore) ListForSale(ctx contractapi.TransactionContextInterface, tokenId string, price int) error {
	nft, err := s.ReadNFT(ctx, tokenId)
	if err != nil {
		return err
	}

	nft.ForSale = true
	nft.Price = price

	nftBytes, err := json.Marshal(nft)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(tokenId, nftBytes)
}

func (s *ABstore) BuyNFT(ctx contractapi.TransactionContextInterface, tokenId, buyer string) error {
	nft, err := s.ReadNFT(ctx, tokenId)
	if err != nil {
		return err
	}

	if !nft.ForSale {
		return fmt.Errorf("NFT %s는 판매중이 아닙니다", tokenId)
	}

	nft.Owner = buyer
	nft.ForSale = false

	nftBytes, err := json.Marshal(nft)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(tokenId, nftBytes)
}

func (s *ABstore) PlaceBid(ctx contractapi.TransactionContextInterface, tokenId string, bidder string, bidPrice int) error {
	nft, err := s.ReadNFT(ctx, tokenId)
	if err != nil {
		return err
	}

	if !nft.ForSale {
		return fmt.Errorf("NFT %s는 경매 중이 아닙니다", tokenId)
	}

	if bidPrice <= nft.BidPrice {
		return fmt.Errorf("제시 가격이 현재 입찰가보다 낮습니다")
	}

	nft.Bidder = bidder
	nft.BidPrice = bidPrice

	nftBytes, err := json.Marshal(nft)
	if err != nil {
		return err
	}

	return ctx.GetStub().PutState(tokenId, nftBytes)
}

func (s *ABstore) AcceptBid(ctx contractapi.TransactionContextInterface, tokenId string) error {
	nft, err := s.ReadNFT(ctx, tokenId)
	if err != nil {
		return err
	}

	if nft.Bidder == "" || nft.BidPrice <= 0 {
		return fmt.Errorf("유효한 입찰이 없습니다")
	}

	return s.TransferNFT(ctx, tokenId, nft.Bidder)
}

func (s *ABstore) GetAllNFTs(ctx contractapi.TransactionContextInterface) ([]*NFT, error) {
	resultsIterator, err := ctx.GetStub().GetStateByRange("", "")
	if err != nil {
		return nil, fmt.Errorf("조회 실패: %v", err)
	}
	defer resultsIterator.Close()

	var nfts []*NFT
	for resultsIterator.HasNext() {
		queryResult, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var nft NFT
		err = json.Unmarshal(queryResult.Value, &nft)
		if err != nil {
			continue
		}
		nfts = append(nfts, &nft)
	}

	return nfts, nil
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