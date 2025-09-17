#!/bin/bash

echo "CA 컨테이너 및 노드 컨테이너 삭제"

docker rm -f $(docker ps -aq)
docker rmi $(docker images dev-* -q)
docker system prune --volumes
docker volume rm $(docker volume ls -q)

cd $GOPATH/src/dev-mode/basic-network/docker
docker-compose -f docker-compose-test-net.yaml down --volumes --remove-orphans
docker-compose -f docker-compose-prod.yaml down --volumes --remove-orphans
docker-compose -f docker-compose-prod-org3.yaml down --volumes --remove-orphans
docker-compose -f docker-compose-ca.yaml down --volumes --remove-orphans
docker-compose -f docker-compose-ca-org3.yaml down --volumes --remove-orphans

echo "프로젝트 인증서 및 트랜잭션 정보 삭제"
## 프로젝트 인증서 및 트랜잭션 정보 삭제s
cd $GOPATH/src/dev-mode/basic-network
sudo rm -fr channel-artifacts
sudo rm -fr organizations/ordererOrganizations
sudo rm -fr organizations/peerOrganizations
sudo rm -fr system-genesis-block

echo "CA 관련 파일 삭제"
## CA 관련 파일 삭제
cd $GOPATH/src/dev-mode
sudo rm -rf basic-network/organizations/fabric-ca/ordererOrg
sudo rm -rf basic-network/organizations/fabric-ca/org1
sudo rm -rf basic-network/organizations/fabric-ca/org2
sudo rm -rf basic-network/organizations/fabric-ca/org3
rm -rf application/wallet
rm -rf application/connection-org1.json
#rm -rf application/package-lock.json
#rm -rf application/node_modules





# echo "📦 Supabase .env 환경변수 로드"

# ENV_PATH="/home/ubuntu/go/src/dev-mode/application/rest/.env"

# SUPABASE_URL=$(grep SUPABASE_URL $ENV_PATH | cut -d '=' -f2)
# SUPABASE_SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY $ENV_PATH | cut -d '=' -f2)

# echo "🔑 Loaded SUPABASE_URL=$SUPABASE_URL"

# echo "🧹 Supabase DB 초기화 중..."

# curl -X POST "$SUPABASE_URL/rest/v1/rpc/reset_wallets" \
#   -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
#   -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
#   -H "Content-Type: application/json" \
#   -d '{}' || echo "⚠️ Supabase 초기화 실패"

# echo "✅ Fabric + Supabase 초기화 완료"es
