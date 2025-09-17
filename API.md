## **깐부대출 API 명세서 (최종본)**

`server.js` 소스 코드를 직접 분석하여 작성된 API 명세입니다.

### 1. 인증 (Authentication)

본 프로젝트의 모든 인증은 `authenticateUser` 미들웨어를 통해 처리됩니다. API 호출 시 HTTP 헤더에 Supabase에서 발급받은 JWT를 포함해야 합니다.

- **Header:** `Authorization: Bearer <SUPABASE_JWT>`

--- 

### 2. 사용자 및 친구 (User & Friends)

#### `POST /api/friends/add`
- **설명:** 다른 사용자에게 친구 요청을 보냅니다.
- **인증:** 필요
- **요청 본문:**
  ```json
  {
    "userId": "<요청자_UUID>",
    "friendEmail": "<친구의_이메일>"
  }
  ```
- **응답 (200 OK):** `{"message": "친구 요청이 전송되었습니다."}`
- **응답 (404 Not Found):** `{"error": "해당 이메일의 사용자를 찾을 수 없습니다."}`

#### `GET /api/friends`
- **설명:** 현재 로그인된 사용자의 친구 목록 전체를 조회합니다.
- **인증:** 필요
- **응답 (200 OK):**
  ```json
  {
    "friends": [
      {
        "id": "<친구_UUID>",
        "profile": {
          "id": "<친구_UUID>",
          "name": "친구 이름",
          "email": "friend@example.com",
          "profile_image_url": "<URL>"
        }
      }
    ]
  }
  ```

#### `GET /api/friends/received`
- **설명:** 내가 받은 친구 요청 목록을 조회합니다.
- **인증:** 필요
- **응답 (200 OK):**
  ```json
  {
    "requests": [
      {
        "id": "<요청_레코드_ID>",
        "user_id": "<요청자_UUID>",
        "profile": { ... } 
      }
    ]
  }
  ```

#### `PATCH /api/friends/request`
- **설명:** 받은 친구 요청을 수락하거나 거절합니다.
- **요청 본문:**
  ```json
  {
    "requestId": "<요청_레코드_ID>",
    "status": "accepted" 
  }
  ```
- **응답 (200 OK):** `{"message": "친구 요청이 업데이트되었습니다."}`

--- 

### 3. P2P 대출 (Peer-to-Peer Loans)

#### `POST /createLoan`
- **설명:** P2P 대출 요청을 생성합니다. (체인코드 호출 및 DB 기록)
- **요청 본문:**
  ```json
  {
    "id": "<대출_고유_ID>",
    "lender": "<채권자_지갑주소>",
    "borrower": "<채무자_지갑주소>",
    "amount": 100000,
    "durationDays": 30,
    "interestRate": 5.0
  }
  ```
- **응답 (200 OK):** `{"message": "Loan created on chain and DB", "txId": "..."}`

#### `GET /approveLoan`
- **설명:** 채권자가 대출 요청을 승인합니다.
- **쿼리 파라미터:** `?id=<대출_고유_ID>`
- **응답 (200 OK):** `{"success": true, "message": "대출 승인 완료 (체인+DB 기록됨)", "chainResult": "..."}`

#### `POST /loan/repay`
- **설명:** 채무자가 대출금을 상환합니다. 상환 시 조기 상환 보너스 점수가 계산되어 신용 점수에 반영됩니다.
- **요청 본문:**
  ```json
  {
    "loanId": "<대출_고유_ID>"
  }
  ```
- **응답 (200 OK):** `{"success": true, "result": "..."}`

#### `GET /myLoans`
- **설명:** 특정 지갑 주소와 관련된 모든 대출(빌린/빌려준) 목록을 체인코드에서 직접 조회합니다.
- **쿼리 파라미터:** `?wallet=<사용자_지갑주소>`
- **응답 (200 OK):** 체인코드에서 반환된 대출 객체 배열

#### `GET /queryAllLoans`
- **설명:** 체인코드에 기록된 모든 대출 목록을 조회합니다.
- **응답 (200 OK):** 체인코드에서 반환된 전체 대출 객체 배열

--- 

### 4. 대출 풀 (Loan Pools)

#### `POST /createPool`
- **설명:** 새로운 대출 풀을 생성합니다.
- **요청 본문:** 
  ```json
  {
      "id": "<풀_ID>",
      "name": "<풀_이름>",
      "minDeposit": 10000,
      "interestRate": 10.0,
      "durationMonths": 6,
      "creatorAddress": "<생성자_지갑주소>",
      "initialDeposit": 50000
  }
  ```
- **응답 (200 OK):** `{"message": "풀 생성 완료", "poolId": "..."}`

#### `POST /joinPool`
- **설명:** 기존 대출 풀에 참여하고 자금을 예치합니다.
- **요청 본문:**
  ```json
  {
      "poolID": "<풀_ID>",
      "userAddress": "<참여자_지갑주소>",
      "deposit": 20000
  }
  ```
- **응답 (200 OK):** `{"message": "참여 완료", "result": "..."}`

#### `GET /QueryPoolsByUser`
- **설명:** 특정 사용자가 참여한 모든 대출 풀 목록을 조회합니다.
- **쿼리 파라미터:** `?wallet=<사용자_지갑주소>`
- **응답 (200 OK):** 풀 객체 배열

--- 

### 5. 계약서 및 검증 (Contract & Verification)

#### `POST /api/contract/save`
- **설명:** 계약서 이미지를 받아 SHA256 해시를 계산하고, 해당 대출 정보에 해시값을 저장합니다.
- **요청 본문:**
  ```json
  {
      "loanId": "<대출_고유_ID>",
      "contractImage": "<Base64_인코딩된_이미지_데이터>"
  }
  ```
- **응답 (200 OK):** `{"success": true, "message": "계약서 해시가 저장되었습니다.", "contractHash": "..."}`

#### `GET /api/transaction/:txHash`
- **설명:** 트랜잭션 해시를 이용해 대출 정보와 계약서 유효성을 함께 조회합니다.
- **경로 파라미터:** `txHash`: 조회할 트랜잭션의 해시값
- **응답 (200 OK):**
  ```json
  {
    "success": true,
    "transaction": {
      "txHash": "...",
      "contractHash": "...",
      "createdAt": "...",
      "loanInfo": { ... },
      "verification": {
        "isContractValid": true,
        "isTransactionValid": true,
        "lastVerified": "..."
      }
    }
  }
  ```

--- 

### 6. 기타 API

#### `POST /check-email`
- **설명:** 주어진 이메일이 이미 가입되었는지 확인합니다.
- **요청 본문:** `{"email": "user@example.com"}`
- **응답 (200 OK):** `{"exists": true, "provider": "google"}`

#### `POST /api/inquiry`
- **설명:** 고객 문의를 접수하고 reCAPTCHA로 스팸을 방지합니다.
- **인증:** 필요
- **요청 본문:**
  ```json
  {
      "name": "문의자 이름",
      "email": "user@example.com",
      "message": "문의 내용",
      "captchaToken": "<reCAPTCHA_토큰>"
  }
  ```
- **응답 (200 OK):** `{"success": true, "data": [ ... ]}`