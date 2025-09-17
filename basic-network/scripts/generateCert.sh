#!/bin/bash

cd $GOPATH/src/dev-mode/basic-network

echo "인증서 생성"

if [ "$1" == "dev" ]; then
  ./bin/cryptogen generate --config=./organizations/cryptogen/crypto-config-org1.yaml --output=organizations
  ./bin/cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer.yaml --output=organizations
  echo "orderer.example.com"
elif [ "$1" == "prod" ]; then
  ./bin/cryptogen generate --config=./organizations/cryptogen/crypto-config-org1-prod.yaml --output=organizations
  ./bin/cryptogen generate --config=./organizations/cryptogen/crypto-config-org2-prod.yaml --output=organizations
  ./bin/cryptogen generate --config=./organizations/cryptogen/crypto-config-orderer-prod.yaml --output=organizations
  echo "orderer.example.com"
else
  echo -n "unknown parameter"
  exit 1
fi
