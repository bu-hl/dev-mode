#!/bin/bash

function generateCert() {
 # 인증서 dev 모드 생성
 basic-network/scripts/generateCert.sh $1
}

function runCAdev() {
 # CA dev 생성
 basic-network/scripts/runCAdev.sh
}

function runCAOrg3() {
 # CA dev 생성
 basic-network/scripts/runCAOrg3.sh
}

function cleanNetwork() {
 # 네트워크 전부 삭제
 basic-network/scripts/cleanNetwork.sh
}

function upNetwork() {
 # 네트워크 실행
 basic-network/scripts/upNetwork.sh $1
}
function createConfigtxgen() {
 # 채널 정보 생성
 basic-network/scripts/createConfigtxgen.sh $1
}

function joinChannel() {
 # 채널 트랜잭션 네트워크 등록
 docker exec cli scripts/joinChannel.sh $1 $2 $3 $4
}

function installCC() {
 # 체인코드 설치
 docker exec cli scripts/installCC.sh $1 $2
}

function checkCC() {
 # 체인코드 현황
 docker exec cli scripts/checkCC.sh $1
}

function startSDK() {
 # SDK 실행
 basic-network/scripts/startSDK.sh
}

function upgradeCC() {
 # 체인코드 업그레이드
 docker exec cli scripts/upgradeCC.sh $1 $2 $3
}
if [ "$1" == "generateCert" ]; then
 generateCert $2
elif [ "$1" == "createConfigtxgen" ]; then
 createConfigtxgen $2
elif [ "$1" == "upNetwork" ]; then
 upNetwork $2
elif [ "$1" == "createChannel" ]; then
 joinChannel createChannel
elif [ "$1" == "joinChannel" ]; then
 joinChannel joinChannel
elif [ "$1" == "joinChannelProd" ]; then
 joinChannel joinChannelProd
elif [ "$1" == "updateAnchor" ]; then
 joinChannel updateAnchor
elif [ "$1" == "updateAnchorProd" ]; then
 joinChannel updateAnchorProd
elif [ "$1" == "installCC" ]; then
 installCC $2 $3
elif [ "$1" == "checkCC" ]; then
 checkCC $2
elif [ "$1" == "runCAdev" ]; then
 runCAdev
elif [ "$1" == "runCAOrg3" ]; then
 runCAOrg3
elif [ "$1" == "startSDK" ]; then
 startSDK
elif [ "$1" == "upgradeCC" ]; then
 upgradeCC $2 $3
elif [ "$1" == "clean" ]; then
 cleanNetwork
elif [ "$1" == "dev" ]; then
 generateCert dev
 sleep 2
 createConfigtxgen dev
 sleep 2
 upNetwork dev
 sleep 2
 joinChannel createChannel
 joinChannel joinChannel
 joinChannel updateAnchor
 sleep 2
 runCAdev
elif [ "$1" == "prod" ]; then
 generateCert prod
 sleep 2
 runCAOrg3
 sleep 2
 createConfigtxgen prod
 sleep 2
 upNetwork prod
 sleep 2
 sleep 2
 joinChannel createChannel
 joinChannel joinChannelProd
 joinChannel updateAnchorProd
 sleep 2
 runCAdev
else
 echo -n "unknown parameter"
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