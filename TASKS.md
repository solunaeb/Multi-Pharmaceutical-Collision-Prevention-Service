# TASKS.md — 개발 작업 목록

> Phase별로 구성된 MVP 개발 로드맵입니다.
> 각 Phase는 이전 Phase의 완료를 전제하며, Phase 내 task는 위에서 아래 순서로 진행합니다.
> 체크박스([ ])는 완료 시 [x]로 변경합니다.

---

## Phase 0: 프로젝트 셋업 (예상 1~2일)

> 목표: 개발 환경 구성, 빈 프로젝트 구조 생성, 로컬에서 실행 확인.

- [ ] **T-0.1** 모노레포 초기화
  - 루트에 `package.json` 생성 (workspaces: `apps/mobile`, `apps/server`)
  - `.gitignore`, `.prettierrc`, `.eslintrc` 설정
  - TypeScript 공통 `tsconfig.base.json` 생성

- [ ] **T-0.2** 프론트엔드 보일러플레이트
  - `npx create-expo-app apps/mobile --template blank-typescript`
  - React Navigation 설치 (bottom-tabs + native-stack)
  - 하단 탭 3개 껍데기 생성: HomeScreen, CameraScreen, HistoryScreen
  - 디자인 토큰 파일 생성 (`constants/colors.ts`, `typography.ts`, `spacing.ts`) — `data/design-tokens.json` 기반

- [ ] **T-0.3** 백엔드 보일러플레이트
  - `apps/server/` Express + TypeScript 초기화
  - 폴더 구조 생성: `controllers/`, `services/`, `repositories/`, `routes/`, `middleware/`, `types/`
  - 헬스체크 엔드포인트 `GET /health` → `{ status: "ok" }`
  - `.env.example` 생성 (DB_URL, ANTHROPIC_API_KEY, KAKAO_CLIENT_ID, AWS_S3_BUCKET 등)

- [ ] **T-0.4** 데이터베이스 셋업
  - Docker Compose로 PostgreSQL + Redis 로컬 실행
  - Prisma 또는 TypeORM 초기화, database.md 기반 스키마 마이그레이션
  - 5개 테이블 생성: `users`, `profiles`, `medications`, `ocr_sessions`, `interaction_logs`

- [ ] **T-0.5** 약물 안전 DB 시딩
  - `data/` 폴더의 JSON 파일을 서버에서 로드할 수 있도록 경로 설정
  - `service-database.json`을 앱 시작 시 메모리에 로드하는 DataLoader 서비스 구현
  - 시딩 스크립트: `common_medications.json` → DB `medications` 테이블에 테스트 데이터 삽입

- [ ] **T-0.6** 로컬 실행 확인
  - 프론트엔드: `expo start` → 에뮬레이터에서 3탭 네비 확인
  - 백엔드: `npm run dev` → `localhost:3000/health` 응답 확인
  - DB: 마이그레이션 완료, 테스트 데이터 조회 확인

---

## Phase 1: 핵심 파이프라인 — 약물 등록 + 충돌 분석 (예상 1~2주)

> 목표: 수동 입력으로라도 약물 등록 → 충돌 분석 → 결과 표시까지 끝단 파이프라인 완성.
> 카메라 OCR은 Phase 2에서 추가. 이 Phase에서는 텍스트 입력으로 먼저 검증.

### 1-A. 백엔드 API

- [ ] **T-1.1** 인증 API
  - 카카오 소셜 로그인 (`POST /api/v1/auth/kakao`)
  - JWT 발급 (Access 15분 + Refresh 7일)
  - 인증 미들웨어 (`requireAuth`)

- [ ] **T-1.2** 프로필 CRUD
  - `POST /api/v1/profiles` — 프로필 생성 (name, birth_year)
  - `GET /api/v1/profiles` — 내 프로필 목록
  - `PATCH /api/v1/profiles/:id` — 프로필 수정
  - 사용자당 최대 5개 제한 validation

- [ ] **T-1.3** 약물 CRUD
  - `POST /api/v1/meds/:profileId` — 약물 등록 (name, ingredient, dose, type, source)
  - `GET /api/v1/meds/:profileId` — 활성 약물 리스트
  - `DELETE /api/v1/meds/:profileId/:medId` — 복용 중단 (soft delete → status: inactive)

- [ ] **T-1.4** 충돌 분석 엔진 (핵심)
  - `POST /api/v1/analysis/check-interaction`
  - **Step 1**: 신규 약물 성분 → `ingredients` 테이블에서 `ingredient_code` 매칭
  - **Step 2**: 기존 활성 약물의 `ingredient_code`와 교차 → `contraindication_pairs`에서 병용금기 조회
  - **Step 3**: `supplement_drug_interactions`에서 건기식 상호작용 조회
  - **Step 4**: `duplicate_ingredient_groups`에서 성분 중복 검출
  - **Step 5**: `elderly_caution`에서 프로필 나이 기반 노인주의 체크
  - **Step 6**: 종합 risk_level 판정 (가장 높은 severity 채택)
  - **Step 7**: Claude API 호출 → 쉬운 언어 요약 + 행동 가이드 생성
  - **Step 8**: `interaction_logs`에 결과 저장

- [ ] **T-1.5** 약물 등록 → 충돌 분석 자동 트리거
  - `POST /api/v1/meds/:profileId` 성공 시 `check-interaction` 자동 실행
  - 등록 응답에 충돌 분석 결과 포함

### 1-B. 프론트엔드 화면

- [ ] **T-1.6** 온보딩 / 로그인
  - 카카오 로그인 버튼 1개
  - 첫 로그인 시 프로필 생성 유도 ("누구의 약을 관리하시나요?" → 아버지/어머니 등)

- [ ] **T-1.7** 홈 화면
  - 상단: 프로필 전환 탭 (pill 형태)
  - 충돌 상태 요약 카드 (최신 risk_level 배경색)
  - 활성 약물 리스트 (카드 UI, 유형 태그 색상 구분)
  - 빈 상태 일러스트 ("등록된 약물이 없습니다")

- [ ] **T-1.8** 약물 수동 등록 화면 (임시)
  - 약품명 + 성분명 텍스트 입력
  - 유형 선택 (처방약 / OTC / 건강기능식품)
  - 프로필 선택
  - "등록하기" → API 호출 → 결과 화면으로 이동

- [ ] **T-1.9** 충돌 분석 결과 화면
  - 트래픽 라이트 상태 배지 (아이콘 + 배경색 + 텍스트)
  - 쉬운 언어 요약 카드
  - "자세히 보기" 접힌 상태 → 탭하면 상세 reason + action_guide
  - 행동 가이드 박스 (Warm Beige 배경)
  - 면책 조항 (캡션 사이즈)

- [ ] **T-1.10** 기록 화면
  - 과거 interaction_logs 리스트 (날짜순 DESC)
  - 각 로그 카드: risk_level 배지 + 요약 + 날짜

### 1-C. 통합 테스트

- [ ] **T-1.11** E2E 시나리오 검증
  - 시나리오 A (PRD): 아버지 프로필에 암로디핀 + 탐스로신 등록 → caution 결과
  - 시나리오 B (PRD): 어머니 프로필에 아스피린 + 이부프로펜 등록 → contraindicated 결과
  - 시나리오 C (PRD): 아버지 프로필에 은행잎추출물 + 와파린 → caution 결과
  - 안전 케이스: 충돌 없는 약물 조합 → safe 결과

---

## Phase 2: 카메라 OCR 통합 (예상 1~2주)

> 목표: "사진 한 장이 입력의 전부" 구현. Phase 1의 수동 입력을 카메라 촬영으로 대체.

- [ ] **T-2.1** OCR 파싱 API
  - `POST /api/v1/ocr/parse` — multipart/form-data 이미지 수신
  - S3 업로드 (presigned URL)
  - Claude Vision API 호출 → 약품명·성분·용량·투약일수·유형 추출
  - `ocr_sessions` 레코드 생성
  - 응답: 추출된 약물 리스트 + 신뢰도

- [ ] **T-2.2** OCR 프롬프트 엔지니어링
  - 약봉투, OTC 박스, 건강기능식품 라벨 각각에 최적화된 프롬프트
  - 출력 포맷 고정: `{ name, ingredient, dose, days, type, confidence }`
  - 한글 약품명 + 영문 성분명 동시 추출 → `ingredients` 테이블 매칭률 최대화
  - 테스트: 실제 약봉투 5장, OTC 3장, 건기식 2장으로 정확도 검증

- [ ] **T-2.3** 카메라 화면
  - 전체 화면 카메라 뷰 (expo-camera)
  - 촬영 가이드 프레임 오버레이
  - 하단 안내 텍스트 ("약봉투, 약 박스, 라벨을 프레임 안에 맞춰주세요")
  - 대형 촬영 버튼 (64px+)
  - 촬영 후 → 로딩 → 인식 결과 화면

- [ ] **T-2.4** 인식 결과 확인 화면
  - 원본 이미지 썸네일
  - 인식된 약물 리스트 (체크박스로 개별 확인/제외)
  - 프로필 선택 ("누구의 약인가요?")
  - "등록하기" → 약물 등록 + 충돌 분석 자동 실행

- [ ] **T-2.5** 홈 화면 연결
  - 하단 탭 "촬영" 탭에서 카메라 바로 실행
  - 홈 화면에 "약 사진 찍기" 플로팅 버튼 (Primary Blue)

- [ ] **T-2.6** OCR 정확도 개선 루프
  - `ocr_sessions`에 사용자 확인/거부 결과 저장
  - 거부율 모니터링 → 프롬프트 튜닝

---

## Phase 3: 품질·안정성·배포 준비 (예상 1~2주)

> 목표: 실사용자에게 배포할 수 있는 수준의 품질 확보.

### 3-A. UX 개선

- [ ] **T-3.1** 로딩 & 에러 상태
  - OCR 파싱 중 스켈레톤 UI / 로딩 스피너
  - AI API 타임아웃 시 사용자 친화적 에러 메시지 + 재시도 버튼
  - 네트워크 오프라인 감지 → 안내 토스트

- [ ] **T-3.2** 빈 상태 & 온보딩
  - 각 화면 빈 상태 일러스트 + CTA
  - 첫 사용 시 간단한 사용 가이드 (3스텝 카드 스와이프)

- [ ] **T-3.3** 약물 관리 UX
  - 약물 카드 스와이프 → "복용 중단" 액션
  - 약물 상세 보기 (등록일, 원본 이미지, 성분 정보)
  - 프로필별 약물 수 배지

### 3-B. 안정성

- [ ] **T-3.4** 에러 핸들링 통합
  - 백엔드: 글로벌 에러 핸들러, 통일된 에러 응답 포맷
  - 프론트엔드: API 에러 → 사용자 친화적 메시지 매핑
  - Claude API 실패 시 fallback (DB 매칭 결과만 표시, 쉬운 언어 변환 없이)

- [ ] **T-3.5** 보안 점검
  - JWT 만료 / 리프레시 플로우 정상 동작 확인
  - API 엔드포인트 인증 미들웨어 전수 확인
  - S3 presigned URL 만료 시간 설정 (1시간)
  - 민감 데이터(약물 정보) 암호화 검토

- [ ] **T-3.6** 성능 최적화
  - Redis 캐시: 프로필별 활성 약물 리스트, 최신 충돌 결과
  - `contraindication_pairs` 조회 최적화 (ingredient_code 인덱스)
  - 이미지 리사이즈 후 S3 업로드 (원본 해상도 제한)

### 3-C. 배포

- [ ] **T-3.7** 환경 분리
  - `.env.development` / `.env.production`
  - AWS 리소스 프로비저닝 (RDS, Lambda, S3, API Gateway)
  - 환경별 API base URL 설정

- [ ] **T-3.8** CI/CD 파이프라인
  - GitHub Actions: lint → test → build
  - 백엔드: Lambda 배포 자동화
  - 프론트엔드: EAS Build (Expo)

- [ ] **T-3.9** 앱 스토어 준비
  - 앱 아이콘, 스플래시 스크린
  - 이용약관, 개인정보처리방침 (약물 데이터 수집·저장 관련)
  - 면책 조항 페이지
  - TestFlight / Google 내부 테스트 트랙 배포

---

## Phase 4: 검증 + 피드백 루프 (예상 2~4주)

> 목표: 실사용자(가족) 테스트 → 핵심 지표 수집 → 개선.

- [ ] **T-4.1** 클로즈드 베타 배포
  - 내부 테스터 5~10명 (실제 부모님 약물로 테스트)
  - 피드백 수집 채널 (인앱 피드백 버튼 또는 카카오톡 오픈채팅)

- [ ] **T-4.2** 핵심 지표 트래킹
  - OCR 인식 성공률 (confirmed / total ocr_sessions)
  - 충돌 분석 정확도 (사용자 피드백 기반)
  - 핵심 플로우 완료율 (촬영 → 등록 → 결과 확인)
  - 프로필 수, 등록 약물 수, 일일 활성 사용자

- [ ] **T-4.3** OCR 정확도 개선
  - 거부된 `ocr_sessions` 분석 → 프롬프트 튜닝
  - 자주 등장하는 약품명 사전(dictionary) 구축
  - 인식 결과에 "직접 수정" 기능 추가

- [ ] **T-4.4** 충돌 분석 품질 개선
  - 의약 전문가(약사) 검수 → false positive/negative 수집
  - `supplement_drug_interactions` 데이터 확대 (15건 → 50건+)
  - `duplicate_ingredient_groups` 확대 (7그룹 → 20그룹+)

- [ ] **T-4.5** 퍼블릭 출시 결정
  - 클로즈드 베타 지표 리뷰
  - 앱 스토어 심사 제출
  - 출시 공지 / 마케팅 준비

---

## 범위 밖 (Not in MVP)

아래 항목은 MVP 이후 검토 대상이며, 현재 Phase에 포함하지 않는다.

- 복약 알림 / 스케줄링
- 다수 대상자 대시보드 (보건소 간호사 등 2차 타겟)
- 자문약사 연계 리포트
- 방문 간 변동 추적
- 다크 모드
- 다국어 지원
- 가족 초대 / 권한 관리
- 복잡한 가족 구조 (5명+ 프로필)
