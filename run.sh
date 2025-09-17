#!/bin/bash

set -e  # 중간에 에러 발생 시 스크립트 중단

echo "깐부대출 전체 초기화 스크립트 시작"

# 0. 변수 설정
GOPATH="$HOME/go"
PROJECT_PATH="$GOPATH/src/dev-mode"
BASIC_PATH="$PROJECT_PATH/basic-network"
ENV_PATH="$PROJECT_PATH/application/rest/.env"

# 1. .env 확인
if [ ! -f "$ENV_PATH" ]; then
  echo "[오류] $ENV_PATH 파일이 없습니다. Supabase URL 설정이 필요합니다."
  exit 1
fi

# 2. 네트워크 초기화
echo "네트워크 초기화 중..."
cd "$PROJECT_PATH"

./network.sh clean --force || {
  echo "[경고] network.sh clean 실패했지만 계속 진행합니다."
}

# 3. Supabase 환경 확인
echo "Supabase .env 환경변수 로드"
SUPABASE_URL=$(grep SUPABASE_URL "$ENV_PATH" | cut -d '=' -f2)
SERVICE_ROLE_KEY=$(grep SUPABASE_SERVICE_ROLE_KEY "$ENV_PATH" | cut -d '=' -f2)

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "[오류] .env 설정이 올바르지 않습니다. SUPABASE_URL 또는 SERVICE_ROLE_KEY가 없습니다."
  exit 1
fi

echo "SUPABASE_URL: $SUPABASE_URL"
echo "SERVICE_ROLE_KEY 길이: ${#SERVICE_ROLE_KEY}"

# 4. Fabric 재시작
cd "$PROJECT_PATH"
echo "Fabric dev 환경 실행"
./network.sh dev

echo "체인코드 설치 대기 중..."
sleep 5

./network.sh installCC dev abstore

echo "SDK 서버 실행"
./network.sh startSDK

