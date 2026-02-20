# Architecture: 다제약물 충돌 방지 서비스

> ⚠️ **Not decided yet** — 아래 아키텍처는 현재 검토 중인 초안이며, 기술 검증 및 팀 논의를 거쳐 변경될 수 있습니다.

---

## 1. Frontend Choice

### 선택: React Native (Expo)

**선택 이유**:
- iOS/Android 동시 지원 — 1차 타겟(30~40대 자녀)은 양쪽 플랫폼에 분포
- 카메라 API 접근 필수 — 약물 사진 촬영이 코어 기능이므로 네이티브 카메라 제어 필요
- Expo로 초기 MVP 빠르게 빌드, 필요 시 eject하여 네이티브 모듈 추가 가능
- React 생태계의 풍부한 UI 라이브러리 활용 (큰 텍스트, 접근성 컴포넌트 등)

**핵심 화면 구성**:
- 홈: 프로필 전환 탭 + 약물 리스트 + 충돌 상태 요약
- 카메라: 사진 촬영 → 인식 결과 확인 → 프로필 배정
- 결과: 트래픽 라이트(안전/주의/금기) + 쉬운 언어 카드
- 기록: 히스토리 + 과거 충돌 리포트

**대안 검토**:
| 대안 | 장점 | 제외 사유 |
|------|------|-----------|
| Flutter | 성능 우수, 단일 코드베이스 | Dart 생태계가 React 대비 작음, LLM/AI SDK 연동 레퍼런스 부족 |
| PWA | 설치 불필요 | 카메라 제어 제한, 푸시 알림 제약 (iOS), 오프라인 성능 부족 |
| Swift + Kotlin (네이티브) | 최고 성능 | 개발 리소스 2배, MVP 속도 저하 |

---

## 2. Backend Structure

### 선택: Node.js (Express) + Serverless Functions

**구조 개요**:

```
Client (React Native)
    │
    ▼
API Gateway
    │
    ├── POST /api/v1/ocr/parse
    │     → 이미지 수신 → AI Vision API 호출 → 약물 데이터 추출·정형화
    │     → 반환: { name, ingredient, dose, days, type }
    │
    ├── POST /api/v1/analysis/check-interaction
    │     → 기존 약물 ID 배열 + 신규 약물 ID 배열 수신
    │     → 약물 상호작용 DB 조회 + LLM 분석
    │     → 반환: { risk_level, reason, action_guide }
    │
    ├── GET /api/v1/meds/:profileId
    │     → 프로필별 Active_Meds 리스트 조회
    │
    ├── POST /api/v1/meds/:profileId
    │     → 신규 약물 등록 + 자동 충돌 분석 트리거
    │
    └── DELETE /api/v1/meds/:profileId/:medId
          → 약물 삭제 (복용 중단)
```

**선택 이유**:
- Node.js는 AI API(Claude, Vision) 연동에 풍부한 SDK·레퍼런스 보유
- Serverless Functions로 OCR 파싱·충돌 분석 등 비동기 작업 처리 — 트래픽에 따라 자동 스케일
- Express로 REST API 빠르게 구축, MVP 이후 필요 시 마이크로서비스 분리

**외부 API 연동**:
| 용도 | 서비스 | 역할 |
|------|--------|------|
| 이미지→텍스트 추출 | Claude Vision API (Anthropic) | 약봉투·OTC 박스·라벨 사진에서 약품명·성분·용량 추출 |
| 약물 상호작용 분석 | Claude API (Anthropic) | DDI 분석 + 쉬운 언어 변환 + 행동 가이드 생성 |
| 약물 기초 데이터 | 식약처 DUR Open API | 한국 의약품 성분정보·병용금기 기준 데이터 |

**대안 검토**:
| 대안 | 장점 | 제외 사유 |
|------|------|-----------|
| Python (FastAPI) | AI/ML 생태계 강점 | 프론트엔드(React Native)와의 풀스택 일관성 저하 |
| Go | 높은 성능 | AI API 연동 SDK 부족, MVP 개발 속도 저하 |

---

## 3. Database Type

### 선택: PostgreSQL (관계형) + Redis (캐시)

**PostgreSQL — 메인 데이터 저장소**:

```
users
  ├── id (PK)
  ├── email
  ├── auth_provider
  └── created_at

profiles (가족 프로필)
  ├── id (PK)
  ├── user_id (FK → users)
  ├── name (예: "아버지", "어머니")
  └── created_at

medications (약물 리스트)
  ├── id (PK)
  ├── profile_id (FK → profiles)
  ├── name (약품명)
  ├── ingredient (성분명)
  ├── dose (용량)
  ├── days (투약일수)
  ├── type (ENUM: 처방약 / OTC / 건강기능식품)
  ├── status (ENUM: active / inactive)
  ├── image_url (원본 촬영 이미지)
  ├── registered_at
  └── deactivated_at

interaction_logs (충돌 분석 기록)
  ├── id (PK)
  ├── profile_id (FK → profiles)
  ├── med_ids (관련 약물 ID 배열)
  ├── risk_level (ENUM: safe / caution / contraindicated)
  ├── reason (충돌 사유)
  ├── action_guide (행동 가이드)
  └── analyzed_at
```

**선택 이유**:
- 약물 간 관계(상호작용)를 표현하기에 관계형 DB가 적합
- 프로필-약물-충돌기록 간 FK 관계로 데이터 무결성 보장
- JSONB 타입으로 AI 분석 결과 등 반정형 데이터도 유연하게 저장
- 오픈소스, 확장성, 커뮤니티 지원 우수

**Redis — 캐시·세션**:
- AI Vision 파싱 결과 임시 캐싱 (동일 이미지 재촬영 시 빠른 응답)
- 사용자 세션 관리
- 자주 조회되는 약물 기초 데이터(DUR 성분정보) 캐싱

**대안 검토**:
| 대안 | 장점 | 제외 사유 |
|------|------|-----------|
| MongoDB | 스키마 유연성 | 약물 간 관계 표현에 불리, JOIN 성능 제한 |
| Supabase (PostgreSQL) | BaaS로 빠른 개발 | MVP 후보로 재검토 가능 — 인증·스토리지 번들 제공 |
| Firebase Firestore | 실시간 동기화 | 복잡한 쿼리 제한, 관계형 데이터 모델에 부적합 |

---

## 4. Authentication Method

### 선택: 소셜 로그인 (카카오 우선) + JWT

**인증 플로우**:

```
사용자 → 카카오 로그인 버튼 탭
       → 카카오 OAuth 인증
       → 서버에서 카카오 토큰 검증
       → JWT(Access Token + Refresh Token) 발급
       → 클라이언트 Secure Storage에 저장
```

**선택 이유**:
- 1차 타겟(30~40대 한국 자녀) — 카카오톡 사용률 96%+, 가장 낮은 진입 장벽
- 별도 회원가입 폼 불필요 — 이메일·비밀번호 입력 없이 1탭 로그인
- PRD 문제 정의: "'내가 먹는 약! 한눈에'는 공인인증서 등 본인인증 절차가 시니어에게 높은 허들" → 소셜 로그인으로 해결
- JWT로 stateless 인증 — 서버 스케일링 용이

**지원 소셜 로그인 (우선순위)**:
1. **카카오** (필수) — 한국 사용자 주력
2. **Apple** (필수) — iOS App Store 정책 요구
3. **Google** (선택) — 글로벌 확장 고려

**보안 고려사항**:
- Access Token: 15분 만료
- Refresh Token: 7일 만료, Secure Storage 저장
- 의료 정보 특성상 HTTPS 필수, 토큰 탈취 시 즉시 무효화 API 제공
- 가족 프로필 데이터는 계정 소유자만 접근 가능 (타인 공유 불가)

**대안 검토**:
| 대안 | 장점 | 제외 사유 |
|------|------|-----------|
| 이메일+비밀번호 | 범용적 | 회원가입 허들 높음, 비밀번호 관리 부담 |
| 휴대폰 번호 인증 | 본인 확인 강력 | SMS 비용, 구현 복잡도, MVP에서 과도 |
| 공인인증서/간편인증 | 의료 데이터 신뢰도 | PRD에서 명시한 시니어 허들 — 배제 |

---

## 5. Hosting Method

### 선택: Vercel (프론트엔드 웹) + AWS (백엔드·DB·스토리지)

**구성**:

```
┌─────────────────────────────────────────────────┐
│                    Client Layer                  │
│  React Native App (iOS/Android)                  │
│  + Vercel (웹 랜딩페이지·관리 대시보드 후속)       │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────┐
│                  Backend Layer (AWS)              │
│                                                  │
│  API Gateway → Lambda (Serverless Functions)     │
│    • /api/v1/ocr/parse                           │
│    • /api/v1/analysis/check-interaction           │
│    • /api/v1/meds/*                              │
│                                                  │
│  or EC2/ECS (Express 서버, 트래픽 증가 시)        │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                  Data Layer (AWS)                 │
│                                                  │
│  RDS PostgreSQL ─── 메인 DB                      │
│  ElastiCache Redis ─── 캐시·세션                  │
│  S3 ─── 약물 촬영 이미지 저장                      │
└─────────────────────────────────────────────────┘
```

**선택 이유**:
- AWS Lambda로 MVP 초기 비용 최소화 (사용량 기반 과금)
- S3에 약물 이미지 저장 — 추후 AI 모델 학습 데이터로 활용 가능
- RDS PostgreSQL — 관리형 DB로 백업·스케일링 자동화
- 한국 리전(ap-northeast-2) 지원 — 낮은 레이턴시
- 트래픽 증가 시 Lambda → ECS 마이그레이션 용이

**앱 배포**:
- iOS: Apple App Store (TestFlight으로 MVP 베타 테스트)
- Android: Google Play Store (내부 테스트 트랙으로 MVP 베타)
- OTA 업데이트: Expo Updates로 앱스토어 심사 없이 JS 번들 업데이트

**대안 검토**:
| 대안 | 장점 | 제외 사유 |
|------|------|-----------|
| GCP | AI/ML 서비스 강점 | 한국 커뮤니티·레퍼런스 AWS 대비 부족 |
| Supabase + Vercel | BaaS로 극초기 빠른 개발 | DB 커스터마이징 제한, 규모 확장 시 마이그레이션 필요 |
| Naver Cloud | 한국 특화 | 글로벌 확장성 제한, 서비스 다양성 부족 |

---

## 요약 (Architecture at a Glance)

| 영역 | 선택 | 핵심 사유 |
|------|------|-----------|
| **Frontend** | React Native (Expo) | 크로스플랫폼 + 카메라 네이티브 접근 + MVP 속도 |
| **Backend** | Node.js (Express) + AWS Lambda | AI API 연동 용이 + 서버리스 비용 효율 |
| **Database** | PostgreSQL + Redis | 관계형 데이터 모델 적합 + 캐시 성능 |
| **Auth** | 카카오 소셜 로그인 + JWT | 한국 사용자 진입 장벽 최소화 |
| **Hosting** | AWS (Lambda + RDS + S3) | 한국 리전 + 스케일링 + 비용 효율 |

> ⚠️ **Not decided yet** — 위 선택은 MVP 기준 초안입니다. 팀 합류, 기술 PoC, 비용 분석 결과에 따라 변경될 수 있습니다.
