#!/bin/bash

cd $GOPATH/src/dev-mode/basic-network/docker

echo "노드 컨테이너 실행"

export COMPOSE_PROJECT_NAME=fabric
export IMAGE_TAG=2.2.2
export SYS_CHANNEL=system-channel

if [ "$1" == "dev" ]; then
  docker-compose -f docker-compose-test-net.yaml -f docker-compose-couch.yaml up -d cli
  docker-compose -f docker-compose-test-net.yaml up -d orderer.example.com
elif [ "$1" == "prod" ]; then

  # docker-compose -f docker-compose-prod.yaml -f docker-compose-couch-prod.yaml up -d cli
  # docker-compose -f docker-compose-prod.yaml up -d orderer.example.com orderer2.example.com
  # docker-compose -f docker-compose-prod-org3.yaml -f docker-compose-couch-org3.yaml up -d cli-org3

    echo "Starting network components from docker-compose-prod.yaml and docker-compose-couch-prod.yaml..."
  docker-compose -f docker-compose-prod.yaml -f docker-compose-couch-prod.yaml up -d

  # Org3 관련 서비스는 별도로 시작합니다 (현재 방식 유지 또는 필요에 따라 위와 통합).
  echo "Starting Org3 components..."
  docker-compose -f docker-compose-prod-org3.yaml -f docker-compose-couch-org3.yaml up -d
else
  echo -n "unknown parameter"
  exit 1
fi

docker ps
