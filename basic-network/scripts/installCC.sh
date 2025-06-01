#!/bin/bash

## 파라미터가 없으면 종료
if [ "$#" -lt 1 ]; then
   echo "$# is Illegal number of parameters."
   echo "Usage: $0 [options]"
 exit 1
fi

function dev() {
  ## 체인코드 패키지화
  echo "체인코드 패키지화"
  cd /opt/gopath/src/github.com/hyperledger/fabric/peer
  peer lifecycle chaincode package $1.tar.gz \
  --path ./chaincode/${1}/javascript/ \
  --lang node \
  --label ${1}_1

  ## Peer0 Org1 체인코드 설치
  echo "Org1 peer0 체인코드 설치"
  peer lifecycle chaincode install ${1}.tar.gz
  sleep 2

  ## 체인코드 패키지 이름 환경변수 지정
  peer lifecycle chaincode queryinstalled >&log.txt
  export PACKAGE_ID=`sed -n '/Package/{s/^Package ID: //; s/, Label:.*$//; $p;}' log.txt`
  echo "packgeID=$PACKAGE_ID"

  echo "체인코드 승인"
  echo "Org1 peer0 체인코드 승인"
  peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --channelID channel1 \
    --name ${1} \
    --version 1 \
    --package-id $PACKAGE_ID \
    --init-required \
    --sequence 1 NA NA NA
  sleep 2

  ## 체인코드 Commit
  echo "체인코드 커밋"
  peer lifecycle chaincode commit \
    -o orderer.example.com:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --channelID channel1 \
    --name ${1} \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --version 1 \
    --init-required \
    --sequence 1 NA NA NA
  sleep 2

  ## 체인코드 Init
  echo "체인코드 Init"
  peer chaincode invoke \
    -o orderer.example.com:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --waitForEvent \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    -C channel1 \
    -n ${1} \
    --peerAddresses peer0.org1.example.com:7051 \
    --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
    --isInit \
    -c '{"Args":["Init"]}' \
    --waitForEvent
}

function prod() {
  ## 체인코드 패키지화
  echo "체인코드 패키지화"
  cd /opt/gopath/src/github.com/hyperledger/fabric/peer
  peer lifecycle chaincode package $1.tar.gz \
  --path ./chaincode/${1}/javascript/ \
  --lang node \
  --label ${1}_1

  ## Peer0 Org1 체인코드 설치
  echo "Org1 peer0 체인코드 설치"
  peer lifecycle chaincode install ${1}.tar.gz
  sleep 2

  ## Peer1 Org1 체인코드 설치
  echo "Org1 peer1 체인코드 설치"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer1.org1.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  export CORE_PEER_ADDRESS=peer1.org1.example.com:8051
  peer lifecycle chaincode install ${1}.tar.gz
  sleep 2

  ## Peer0 Org2 체인코드 설치
  echo "Org2 peer0 체인코드 설치"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org2MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
  export CORE_PEER_ADDRESS=peer0.org2.example.com:9051
  peer lifecycle chaincode install ${1}.tar.gz
  sleep 2

  ## Peer1 Org2 체인코드 설치
  echo "Org2 peer1 체인코드 설치"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org2MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer1.org2.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
  export CORE_PEER_ADDRESS=peer1.org2.example.com:10051
  peer lifecycle chaincode install ${1}.tar.gz
  sleep 2

  ## 체인코드 패키지 이름 환경변수 지정
  peer lifecycle chaincode queryinstalled >&log.txt
  export PACKAGE_ID=`sed -n '/Package/{s/^Package ID: //; s/, Label:.*$//; $p;}' log.txt`
  echo "packgeID=$PACKAGE_ID"

  echo "체인코드 승인"
  echo "Org1 peer0 체인코드 승인"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --channelID channel1 \
    --name ${1} \
    --version 1 \
    --package-id $PACKAGE_ID \
    --sequence 1 NA NA NA

  echo "Org2 peer0 체인코드 승인"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org2MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
  export CORE_PEER_ADDRESS=peer0.org2.example.com:9051
  peer lifecycle chaincode approveformyorg \
    -o orderer.example.com:7050 \
    --ordererTLSHostnameOverride orderer.example.com \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --channelID channel1 \
    --name ${1} \
    --version 1 \
    --package-id $PACKAGE_ID \
    --sequence 1 NA NA NA

  peer lifecycle chaincode checkcommitreadiness \
    -o orderer.example.com:7050 \
    --channelID channel1 \
    --tls \
    --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
    --name ${1} \
    --version 1 \
    --sequence 1 NA NA NA

  ## 체인코드 Commit
  echo "체인코드 커밋"
  export CORE_PEER_TLS_ENABLED=true
  export CORE_PEER_LOCALMSPID="Org1MSP"
  export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
  export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
  export CORE_PEER_ADDRESS=peer0.org1.example.com:7051
  peer lifecycle chaincode commit \
  -o orderer.example.com:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID channel1 \
  --name ${1} \
  --peerAddresses peer0.org1.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --peerAddresses peer0.org2.example.com:9051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt \
  --version 1 \
  --sequence 1 NA NA NA
}

if [ "$1" == "dev" ]; then
 dev $2
elif [ "$1" == "prod" ]; then
 prod $2
else
 echo -n "unknown parameter"
 exit 1
fi