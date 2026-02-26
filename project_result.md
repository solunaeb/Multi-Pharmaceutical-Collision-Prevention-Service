# 약궁합 — 다제약물 충돌 방지 서비스 (프로젝트 결과)

## 프로젝트 개요

약 사진 촬영 → AI 자동 인식 → 처방약·OTC·건강기능식품 통합 충돌 분석 → 쉬운 언어 안내.
부모님 약물 안전을 자녀가 원격으로 확인하는 모바일 웹 서비스.

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, React Query |
| Backend | Express.js, TypeScript |
| Database | SQLite (Prisma ORM) |
| AI/OCR | Claude Vision API (이미지 → 약물 인식), Claude API (충돌 분석 + 쉬운 언어 요약) |
| 구조 | npm workspaces 모노레포 (`apps/web`, `apps/server`) |

## 핵심 기능 3가지

### 1. 사진 → 자동 추출
- 약 사진 업로드 → Claude Vision API가 약물명, 성분, 용량, 복용일수 자동 추출
- 이미지 크롭 기능으로 원하는 영역만 선택 가능
- Tesseract OCR 보조 (한국어/영어 지원)
- 전체 텍스트 키워드 선택 기능 (선택사항)

### 2. 다중 출처 충돌 분석
- 처방약 + OTC + 건강기능식품 통합 관리
- 신규 약물 등록 시 기존 약물 전체와 자동 충돌 검사
- 7단계 충돌 엔진: 성분 코드 매칭 → 금기 쌍 → 보충제-약물 상호작용 → 중복 성분 → 연령 금기 → 임신 금기 → 고령자 주의
- 위험도 3단계: safe(안전) / caution(주의) / contraindicated(금기)

### 3. 쉬운 언어 안내
- Claude API가 약학 전문 정보를 일상 언어로 변환
- "의사/약사에게 확인하세요" 행동 가이드 포함
- 의학적 진단 대체 불가 안내 필수 표시

## 프로젝트 구조

```
Multi_Pharmaceutical_Collision_Prevention_Service/
├── apps/
│   ├── web/                          # Next.js 프론트엔드
│   │   └── src/
│   │       ├── app/                  # 페이지 (App Router)
│   │       │   ├── page.tsx          # 홈 (히어로 + 빠른행동 + 약물리스트)
│   │       │   ├── upload/           # 사진 업로드 → OCR → 확인 → 등록
│   │       │   ├── meds/             # 약물 관리 (프로필별)
│   │       │   ├── analysis/         # 충돌 분석 결과
│   │       │   └── history/          # 분석 기록
│   │       ├── components/           # 재사용 UI 컴포넌트
│   │       ├── hooks/                # React Query 커스텀 훅
│   │       ├── context/              # ProfileContext
│   │       ├── lib/                  # API 클라이언트, 유틸리티
│   │       └── types/                # TypeScript 타입 정의
│   │
│   └── server/                       # Express 백엔드
│       ├── prisma/                   # DB 스키마 + 마이그레이션
│       └── src/
│           ├── controllers/          # 요청 처리
│           ├── services/             # 비즈니스 로직 (OCR, 분석, Claude)
│           ├── repositories/         # 데이터 접근 (Prisma)
│           ├── routes/               # API 라우트
│           └── middleware/           # 에러 핸들링
│
├── files_real/                       # 약물 안전성 데이터 (45,893건)
│   ├── ingredients.json              # 성분 5,537건
│   ├── contraindication_pairs.json   # 금기 쌍 35,399건
│   ├── supplement_drug_interactions.json
│   ├── duplicate_ingredient_groups.json
│   ├── age_contraindications.json
│   ├── pregnancy_contraindications.json
│   ├── elderly_caution.json
│   └── common_medications.json       # 테스트 시드 데이터 25건
│
└── docs (*.md)                       # PRD, DB설계, 아키텍처, 디자인, 벤치마크
```

## API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/v1/profiles` | 프로필 목록 |
| POST | `/api/v1/profiles` | 프로필 생성 |
| POST | `/api/v1/ocr/parse` | 이미지 → 약물 추출 (Claude Vision) |
| GET | `/api/v1/meds/:profileId` | 프로필별 약물 목록 |
| POST | `/api/v1/meds/:profileId` | 약물 등록 + 자동 충돌 분석 |
| DELETE | `/api/v1/meds/:profileId/:medId` | 약물 비활성화 |
| POST | `/api/v1/analysis/check-interaction` | 충돌 분석 실행 |
| GET | `/api/v1/analysis/history/:profileId` | 분석 기록 |
| GET | `/health` | 서버 상태 확인 |

## 데이터베이스 (SQLite)

4개 테이블: `profiles` → 1:N → `medications`, `ocr_sessions`, `interaction_logs`

## 실행 방법

```bash
# 의존성 설치
npm install

# DB 생성 + 시드 데이터
cd apps/server
npx prisma migrate dev --name init
npm run db:seed

# 실행 (서버 :3001 + 웹 :3000)
cd ../..
npm run dev
```

## 디자인 특징

- 한국어 UI (Pretendard 폰트)
- 모바일 퍼스트 반응형
- 빨간색(#EF4444)은 오직 금기(contraindicated) 경고에만 사용
- 히어로 영역 (파란 그래디언트) + 빠른 행동 카드 + 프로필 기반 홈 화면
- 모든 아이콘에 텍스트 라벨 포함, 최소 폰트 16px

## 의료 면책 조항

이 서비스는 정보 제공 목적이며, 의학적 진단을 대체하지 않습니다.
모든 분석 결과 화면에 면책 안내가 표시됩니다.
