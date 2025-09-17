#!/bin/bash
cd $GOPATH/src/dev-mode/basic-network/docker

echo "CA 컨테이너 실행"
docker-compose -f docker-compose-ca-org3.yaml up -d

sleep 3
cd $GOPATH/src/dev-mode/basic-network
./organizations/fabric-ca/registerEnroll.sh org3
