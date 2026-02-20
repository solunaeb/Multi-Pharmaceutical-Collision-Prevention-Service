# CLAUDE.md — 다제약물 충돌 방지 서비스

> 이 파일은 Claude Code가 프로젝트를 이해하고 작업하기 위한 마스터 지침서입니다.
> 모든 세부 사항은 개별 문서를 참고하되, 이 파일의 원칙이 최우선합니다.

---

## 프로젝트 한 줄 요약

약 사진 촬영 → AI 자동 인식 → 처방약·OTC·건강기능식품 통합 충돌 분석 → 쉬운 언어 안내.
부모님 약물 안전을 자녀가 원격으로 확인할 수 있는 모바일 서비스.

---

## 프로젝트 문서 구조

```
docs/
├── PRD.md                 # 문제 정의, 타겟 유저, 3 core features, scope limitations
├── benchmark.md           # 유사 서비스 분석 (DUR, Medisafe, PillPack), UX 패턴
├── architecture.md        # 기술 스택 선택 (Not decided yet)
├── database.md            # 테이블 정의, ER 관계, JSONB 구조, 쿼리 패턴
└── design-reference.md    # 비주얼 스타일, 컬러 테마, 레이아웃 와이어프레임
```

작업 전 반드시 관련 문서를 읽고 시작할 것. 문서 간 충돌이 있으면 이 CLAUDE.md의 내용을 우선한다.

---

## 핵심 원칙 (모든 작업에 적용)

### 1. 기능은 딱 3개다

절대로 3개를 초과하는 기능을 만들지 않는다. 기능이 많아지면 실패 확률이 높아진다.

| # | 기능 | 설명 |
|---|------|------|
| 1 | **사진 촬영 → 자동 추출** | 카메라로 약봉투·OTC 박스·라벨 촬영 → AI Vision이 약품명·성분·용량·투약일수 추출 → 정형 데이터 저장 |
| 2 | **멀티소스 통합 충돌 분석** | 처방약+OTC+건강기능식품 하나의 리스트로 병합 → 신규 등록 시 기존 전체와 자동 대조 → 성분 중복·병용 금기·용량 초과 검출 |
| 3 | **쉬운 언어 위험 안내** | LLM(Claude)으로 전문 약학 정보를 일상 언어로 변환 → "의사에게 이렇게 말씀하세요" 행동 가이드 포함 |

이 3개 기능에 해당하지 않는 것은 만들지 않는다. 예를 들어:
- ❌ 복약 알림/스케줄링
- ❌ 다수 대상자 대시보드 (2차 타겟 기능)
- ❌ 자문약사 연계 리포트
- ❌ 방문 간 변동 추적
- ❌ 복잡한 권한 관리

### 2. 타겟 유저를 잊지 않는다

- **1차 타겟 (MVP)**: 부모님을 돌보는 30~40대 성인 자녀
- 실질적 수혜자: 60~70대 다제약물 복용 시니어 (직접 사용자가 아님)
- 2차 타겟(보건소 간호사 등)은 MVP 범위 밖

모든 UI 텍스트, 에러 메시지, 가이드 문구는 **비전문가인 자녀가 읽고 바로 이해할 수 있는 수준**으로 작성한다. 전문 용어가 필요한 경우 반드시 쉬운 말을 먼저 쓰고 괄호 안에 전문 용어를 병기한다.

### 3. 의료 행위가 아님을 명시한다

이 서비스는 **정보 제공** 서비스다. 모든 분석 결과 화면에 면책 조항을 포함한다:
- "이 정보는 참고용이며, 의학적 진단을 대체하지 않습니다."
- 결과가 "금기"여도 "즉시 복용을 중단하세요"가 아니라 "의사·약사에게 확인하세요"로 안내한다.
- 보수적 가이드 원칙: 확실하지 않으면 "확인이 필요합니다"로 표현한다.

---

## 기술 스택 (Not decided yet)

> architecture.md 참고. 아래는 현재 검토 중인 초안이며 변경될 수 있다.

| 영역 | 선택 | 비고 |
|------|------|------|
| Frontend | React Native (Expo) | iOS/Android 크로스플랫폼, 카메라 네이티브 접근 |
| Backend | Node.js (Express) + AWS Lambda | AI API 연동, 서버리스 비용 효율 |
| Database | PostgreSQL + Redis | 관계형 모델, 캐시 |
| Auth | 카카오 소셜 로그인 + JWT | 한국 사용자 진입 장벽 최소화 |
| Hosting | AWS (Lambda + RDS + S3) | 한국 리전 (ap-northeast-2) |
| AI | Claude Vision API + Claude API | 이미지→텍스트 추출 + 충돌 분석 + 쉬운 언어 변환 |
| 약물 데이터 | 식약처 DUR Open API + 로컬 DB | 한국 의약품 성분정보·병용금기 기준 |

### 통합 약물 안전 DB

**`service-database.json`** (17MB) — 8개 테이블, 45,893 레코드, 실서비스용 통합 DB.
모든 테이블은 `ingredient_code`(성분코드)로 연결된다.

```
service-database.json           # 통합 DB (아래 8개 테이블 전체 포함)
data/                           # 개별 테이블 (JSON + CSV 쌍)
├── ingredients.json/csv              # 성분 마스터 (5,537 성분)
├── contraindication_pairs.json/csv   # 병용금기 성분쌍 (35,399쌍)
├── supplement_drug_interactions.json/csv  # 건기식↔의약품 (15건, DUR 미커버)
├── duplicate_ingredient_groups.json/csv   # OTC 성분 중복 (7그룹)
├── age_contraindications.json/csv    # 연령금기 (527 성분)
├── pregnancy_contraindications.json/csv   # 임산부금기 (3,793 성분)
├── elderly_caution.json/csv          # 노인주의 (590 제품)
├── common_medications.json/csv       # 시드/테스트용 약물 (25건)
├── design-tokens.json                # 디자인 토큰 (컬러·타이포·간격)
├── api-spec.json                     # API 엔드포인트 스펙
└── external-data-sources.json        # 외부 데이터 소스 가이드
```

**충돌 분석 데이터 조회 흐름**:
1. OCR 추출된 성분명 → `ingredients`에서 `ingredient_code` 조회
2. `ingredient_code` 쌍 → `contraindication_pairs`에서 병용금기 매칭
3. 건기식 타입이면 → `supplement_drug_interactions`에서 추가 매칭
4. 동일 성분 다른 이름 → `duplicate_ingredient_groups`에서 중복 검출
5. 프로필 birth_year 기반 → `age_contraindications`, `elderly_caution`에서 노인 경고
6. 매칭 결과 + 원본 데이터 → Claude API로 쉬운 언어 변환 + 행동 가이드 생성

---

## API 엔드포인트

```
POST   /api/v1/ocr/parse                    # 이미지 → 약물 데이터 추출
POST   /api/v1/analysis/check-interaction    # 충돌 분석 실행
GET    /api/v1/meds/:profileId               # 프로필별 활성 약물 리스트 조회
POST   /api/v1/meds/:profileId               # 신규 약물 등록 (→ 자동 충돌 분석 트리거)
DELETE /api/v1/meds/:profileId/:medId        # 약물 비활성화 (복용 중단)
```

상세 입출력 스펙은 PRD.md와 architecture.md를 참고.

---

## 데이터베이스 핵심 구조

```
users ──1:N──▶ profiles ──1:N──▶ medications
                   │                    │
                   │ 1:N                │ N:M (analyzed_med_ids)
                   ▼                    ▼
              ocr_sessions       interaction_logs
```

5개 테이블: `users`, `profiles`, `medications`, `ocr_sessions`, `interaction_logs`

핵심 ENUM 값:
- 약물 유형 (`med_type`): `prescription` / `otc` / `supplement`
- 약물 상태 (`med_status`): `active` / `inactive`
- 위험도 (`risk_level`): `safe` / `caution` / `contraindicated`
- 충돌 유형 (`interaction_type`): `contraindication` / `duplicate` / `dose_excess`

상세 스키마, JSONB 구조, 쿼리 패턴은 database.md 참고.

---

## 핵심 User Flow

```
사진 촬영 → AI 파싱 → 인식 결과 확인("맞아요" 1탭) → 프로필 선택("아버지"/"어머니")
→ 약물 등록 → 기존 리스트와 자동 충돌 분석 → 결과 표시 (안전/주의/금기)
```

이 흐름의 모든 단계에서 사용자의 입력을 최소화한다:
- 타이핑 제로 — 사진 한 장이 입력의 전부
- 프로필 선택은 1탭
- 결과는 신호등 컬러로 3초 안에 이해 가능

---

## 디자인 규칙

### 컬러

| 용도 | 색상 | HEX |
|------|------|-----|
| Primary (메인 액션) | Blue | `#3B82F6` |
| 안전 (Safe) | Green | `#10B981` |
| 주의 (Caution) | Amber | `#F59E0B` |
| 금기 (Contraindicated) | Red | `#EF4444` |
| 본문 텍스트 | Gray 900 | `#111827` |
| 페이지 배경 | Gray 50 | `#F9FAFB` |
| 카드 배경 | White | `#FFFFFF` |

약물 유형 태그: 처방약 `#DBEAFE`, OTC `#EDE9FE`, 건강기능식품 `#CCFBF1`

### 타이포그래피

- 서체: **Pretendard Variable** (한국 정부 공공 UI 표준, SIL OFL)
- 본문 최소 **16px**, 제목 22~28px
- 14px 미만은 면책 조항·캡션 용도 외 사용 금지

### 레이아웃

- 하단 네비게이션 **3탭**: 홈 | 촬영 | 기록
- 모든 핵심 작업은 **2탭 이내** 완료
- 카드 기반 UI, border-radius 16px, 충분한 여백
- 모든 아이콘에 텍스트 라벨 병기 (아이콘 단독 사용 금지)
- 시맨틱 컬러는 색상 + 아이콘(✓/⚠/✕) + 텍스트로 삼중 전달 (색약 대응)

상세 컴포넌트 스타일, 와이어프레임은 design-reference.md 참고.

---

## 코딩 규칙

### 일반
- 언어: TypeScript (프론트엔드 + 백엔드 모두)
- 린팅: ESLint + Prettier
- 네이밍: 변수·함수 camelCase, 컴포넌트 PascalCase, DB 컬럼 snake_case
- 커밋 메시지: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

### 프론트엔드 (React Native)
- 상태 관리: React Context (MVP 규모에서 충분), 필요 시 Zustand
- 네비게이션: React Navigation (bottom tabs + stack)
- 스타일링: StyleSheet (React Native 기본), 디자인 토큰 파일에서 색상·간격·타이포 참조
- 컴포넌트 구조:
  ```
  src/
  ├── components/      # 재사용 UI 컴포넌트 (Card, Button, Badge, Tag ...)
  ├── screens/         # 화면 단위 (HomeScreen, CameraScreen, HistoryScreen ...)
  ├── navigation/      # 네비게이션 설정
  ├── services/        # API 호출 함수
  ├── hooks/           # 커스텀 훅
  ├── context/         # 전역 상태 (AuthContext, ProfileContext)
  ├── types/           # TypeScript 타입 정의
  └── constants/       # 디자인 토큰 (colors, typography, spacing)
  ```

### 백엔드 (Node.js)
- 구조: Controller → Service → Repository 패턴
- 에러 핸들링: 통일된 에러 응답 포맷 `{ error: { code, message } }`
- 환경 변수: `.env`로 관리, API 키·DB 접속정보 절대 하드코딩 금지
- AI API 호출 시 타임아웃 설정 필수 (30초), 실패 시 사용자에게 재시도 안내

### 보안
- 모든 API 통신 HTTPS 필수
- JWT Access Token 15분, Refresh Token 7일
- 사용자 데이터(약물 정보)는 계정 소유자만 접근 가능
- S3 이미지 URL은 presigned URL로 제한된 시간만 접근 허용

---

## 자주 참고할 시나리오

### 시나리오 A: 새 처방전 등록
아버지가 비뇨기과에서 새 약 처방 → 자녀가 약봉투 사진 촬영 → AI가 약품명·성분 추출 → 기존 내과 처방약과 대조 → 충돌 위험 알림.
> "아버지가 드시는 혈압약(암로디핀)과 새로 처방된 약(탐스로신)은 병용 시 저혈압 위험이 있습니다. 다음 진료 시 의사에게 현재 복용 중인 혈압약을 알려주세요."

### 시나리오 B: OTC 사각지대 포착
어머니가 약국에서 소염진통제(이부프로펜) 직접 구매 → 약 박스 사진 촬영 → 기존 아스피린과 대조 → 위험 경고.
> "현재 드시는 아스피린과 이부프로펜을 함께 복용하면 위장관 출혈 위험이 증가할 수 있습니다."

### 시나리오 C: 건강기능식품 충돌
아버지가 은행잎추출물 건강기능식품 구매 → 제품 라벨 사진 촬영 → 기존 항응고 관련 약물과 대조 → 주의 안내.
> "은행잎추출물은 혈액 응고에 영향을 줄 수 있어, 현재 복용 중인 약물과 함께 드실 경우 주의가 필요합니다."

---

## 하지 말아야 할 것 (Don'ts)

- ❌ 3개 핵심 기능 외의 기능을 추가하지 않는다
- ❌ "복용을 중단하세요" 같은 의료적 지시를 하지 않는다
- ❌ 전문 용어를 쉬운 말 없이 단독으로 사용하지 않는다
- ❌ 빨간색을 금기(contraindicated) 경고 외 용도로 사용하지 않는다
- ❌ 14px 미만 텍스트를 면책·캡션 외 용도로 사용하지 않는다
- ❌ 아이콘을 텍스트 라벨 없이 단독으로 사용하지 않는다
- ❌ 한 화면에 여러 목적의 정보를 섞지 않는다
- ❌ 손글씨 처방전 인식을 시도하지 않는다 (인쇄물만 대상)
- ❌ 2차 타겟(관리사) 전용 기능을 MVP에 포함하지 않는다
