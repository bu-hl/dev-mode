#!/bin/bash

## 파라미터가 없으면 종료
if [ "$#" -lt 1 ]; then
   echo "$# is Illegal number of parameters."
   echo "Usage: $0 [options]"
 exit 1
fi

function dev(){
  ## 체인코드 패키지화
  echo "체인코드 패키지화"
  cd /opt/gopath/src/github.com/hyperledger/fabric/peer
  peer lifecycle chaincode package ${1}_${2}.tar.gz \
  --path ./chaincode/${1}/javascript/ \
  --lang node \
  --label "${1}_${2}"

  echo "Org1 peer0 체인코드 설치"
  ## Org1 체인코드 설치
  peer lifecycle chaincode install ${1}_${2}.tar.gz

  ## 체인코드 패키지 이름 환경변수 지정
  peer lifecycle chaincode queryinstalled >&log.txt
  export PACKAGE_ID=`sed -n '/Package/{s/^Package ID: //; s/, Label:.*$//; $p;}' log.txt`
  export SEQ=`sed -n '/'${1}'_/p' log.txt | wc -l`

  echo "packgeID=$PACKAGE_ID"
  echo "sequence=$SEQ"

  echo "체인코드 승인"
  ## 체인코드 승인(approve)
  peer lifecycle chaincode approveformyorg \
  -o orderer.example.com:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID channel1 \
  --name ${1} \
  --version ${2} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQ}

  echo "체인코드 커밋"
  ## 체인코드 Commit
  peer lifecycle chaincode commit \
  -o orderer.example.com:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID channel1 \
  --name ${1} \
  --peerAddresses peer0.org1.example.com:7051 \
  --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt \
  --version ${2} \
  --sequence ${SEQ}
}

function prod(){
  ## 체인코드 패키지화
  echo "체인코드 패키지화"
  cd /opt/gopath/src/github.com/hyperledger/fabric/peer
  peer lifecycle chaincode package ${1}_${2}.tar.gz \
  --path ./chaincode/${1}/javascript/ \
  --lang node \
  --label "${1}_${2}"

  echo "Org1 peer0 체인코드 설치"
  ## Org1 체인코드 설치
  peer lifecycle chaincode install ${1}_${2}.tar.gz
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
  export SEQ=`sed -n '/'${1}'_/p' log.txt | wc -l`

  echo "packgeID=$PACKAGE_ID"
  echo "sequence=$SEQ"

  echo "체인코드 승인"
  ## 체인코드 승인(approve)
  peer lifecycle chaincode approveformyorg \
  -o orderer.example.com:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls \
  --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem \
  --channelID channel1 \
  --name ${1} \
  --version ${2} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQ}

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
  --version ${2} \
  --package-id ${PACKAGE_ID} \
  --sequence ${SEQ}

  echo "체인코드 커밋"
  ## 체인코드 Commit
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
  --version ${2} \
  --sequence ${SEQ}
}

if [ "$1" == "dev" ]; then
 dev $2 $3
elif [ "$1" == "prod" ]; then
 prod $2 $3
else
 echo -n "unknown parameter"
 exit 1
fi