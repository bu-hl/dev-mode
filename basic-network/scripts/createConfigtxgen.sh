#!/bin/bash

cd $GOPATH/src/dev-mode/basic-network

echo "제네시스 블록 및 채널 파일 생성"

if [ "$1" == "dev" ]; then
  export FABRIC_CFG_PATH=${PWD}/configtx/
  ./bin/configtxgen -profile DevOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block
  ./bin/configtxgen -profile DevChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID channel1
elif [ "$1" == "prod" ]; then
  export FABRIC_CFG_PATH=${PWD}/configtx-prod/
  ./bin/configtxgen -profile DevOrdererGenesis -channelID system-channel -outputBlock ./system-genesis-block/genesis.block
  ./bin/configtxgen -profile DevChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID channel1
  ./bin/configtxgen -profile DevChannel2 -outputCreateChannelTx ./channel-artifacts/channel2.tx -channelID channel2
else
  echo -n "unknown parameter"
  exit 1
fi
