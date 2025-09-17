#!/bin/bash

if [ "$1" == "react" ]; then
  echo "React 애플리케이션을 시작합니다..."
  cd ./application/client-react
  npm start
else
  cd ./basic-network/
  cp -r ../../fabric-samples/bin/ .
  echo "바이너리 복사됨"
  cd ../

  cd ./application # application 폴더로 이동
  npm install connect-history-api-fallback
  echo "필요한거 설치됨"
  cd ./client-react
  npm install
  echo "리액트 설치"
fi