# CRONEWS v2

뉴스 RSS·Atom을 자동 수집하고, Gemini를 기본·Groq를 폴백으로 사용해 한국어 뉴스 퀴즈를 생성하는 가로세로 뉴스 서비스입니다. 기존 해커톤 프로토타입을 Vercel용 단일 Next.js 애플리케이션으로 재구축하고 있습니다.

## 현재 구현

- Next.js App Router 단일 애플리케이션
- PostgreSQL/Drizzle 데이터 모델과 마이그레이션
- RSS·Atom 파서, 조건부 요청, URL 정규화, 중복 지문
- Gemini 2.5 Flash → Groq Qwen 3.6 27B 폴백 계층
- Zod 기반 뉴스 문제 검증
- 한글 가로세로 퍼즐 배치·검증 알고리즘
- 인증된 Vercel 일일 Cron

## 로컬 실행

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

API 키가 없는 상태에서도 수집·퍼즐 알고리즘 테스트와 빌드는 실행할 수 있습니다.

```bash
pnpm test
pnpm typecheck
pnpm build
```

## 자동화

Vercel Cron은 매일 오전 5시(Asia/Seoul)에 `/api/cron/daily`를 호출합니다. 요청은 `CRON_SECRET` Bearer 토큰으로 검증되며, 작업은 날짜 기반 멱등키로 기록됩니다.

## 운영 원칙

- 뉴스 원문 전체를 저장하지 않고 공개 피드 메타데이터와 원문 링크만 저장합니다.
- 무료 LLM에는 공개 기사 데이터만 전달하며 사용자 데이터와 관리자 메모를 전달하지 않습니다.
- 생성 결과가 검증 기준을 통과하지 못하면 자동 발행하지 않습니다.
