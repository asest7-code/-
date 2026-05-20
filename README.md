# 광고 대행사용 URL 기반 광고 성과 대시보드

Looker Studio와 월간 보고서를 대체하기 위한 Next.js SaaS MVP입니다. 관리자는 클라이언트를 만들고 CSV/XLSX 광고 성과 파일을 업로드하며, 광고주는 공유 URL로 본인 대시보드와 보고서 화면을 확인합니다.

## 기술 스택

- Next.js App Router, TypeScript, Tailwind CSS
- Recharts
- Supabase PostgreSQL, Supabase Storage 준비 구조
- Prisma ORM
- NextAuth Credentials 로그인
- xlsx 기반 CSV/XLSX 파싱
- CSV 다운로드, 브라우저 인쇄/PDF 저장 최적화

## 로컬 실행 방법

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

- 데모: `http://localhost:3000/demo`
- 관리자: `http://localhost:3000/admin`
- 로그인: `http://localhost:3000/login`

`/demo`는 DB 연결 전에도 샘플 데이터로 UI를 확인할 수 있습니다.

## Supabase 설정 방법

1. Supabase에서 새 프로젝트를 생성합니다.
2. Project Settings > Database에서 connection string을 확인합니다.
3. Transaction pooler가 아닌 direct connection URL을 Prisma migration용 `DATABASE_URL`로 사용합니다.
4. Project Settings > API에서 `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`를 확인합니다.
5. 파일 저장 확장이 필요하면 Storage bucket을 만들고 서버 Route에서 `SUPABASE_SERVICE_ROLE_KEY`만 사용하세요.

## 환경변수 설정

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
NEXTAUTH_SECRET="긴 랜덤 문자열"
NEXTAUTH_URL="http://localhost:3000"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
OPENAI_API_KEY=""
```

`SUPABASE_SERVICE_ROLE_KEY`는 서버 전용입니다. 클라이언트 컴포넌트에서 import하거나 노출하지 마세요.

## Prisma Migration

```bash
npm run prisma:generate
npm run prisma:migrate
```

운영 DB에 반영할 때는 로컬에서 migration 파일을 만든 뒤 Vercel 배포 전/후에 `prisma migrate deploy`를 실행하는 방식을 권장합니다.

## Seed 실행

```bash
npm run seed
```

관리자 계정:

- 이메일: `admin@example.com`
- 비밀번호: `admin1234`

샘플 클라이언트:

- `progressmedia`
- `sample-client`

## CSV/XLSX 업로드 방법

1. `/admin/clients/new`에서 클라이언트를 생성합니다.
2. `/admin/upload`에서 클라이언트와 파일을 선택합니다.
3. 미리보기로 필수 컬럼, 날짜 형식, 숫자 컬럼 오류를 확인합니다.
4. 업로드 확정 시 중복 키는 upsert로 업데이트됩니다.

필수 컬럼:

```text
date, platform, campaign_name, ad_group_name, ad_name, impressions, clicks, cost, conversions, revenue
```

선택 컬럼:

```text
device, keyword, creative_name, landing_page, purchases, leads, memo
```

샘플 파일:

```bash
npm run sample:csv
```

생성 위치: `samples/sample-ad-data.csv`

## Vercel 배포 방법

1. GitHub 저장소를 Vercel에 연결합니다.
2. Vercel Project Settings > Environment Variables에 `.env.example`의 값을 등록합니다.
3. Supabase `DATABASE_URL`은 운영 DB URL을 사용합니다.
4. Build Command는 기본값 또는 `npm run build`를 사용합니다.
5. 최초 배포 전 Supabase DB에 migration과 seed를 적용합니다.

```bash
npm run prisma:migrate
npm run seed
```

운영에서는 seed 관리자 비밀번호를 즉시 변경하거나 별도 계정으로 교체하세요.

## 광고주 공유 URL

- 대시보드: `/dashboard/[clientSlug]`
- 보고서: `/dashboard/[clientSlug]/report`
- 예: `https://your-domain.vercel.app/dashboard/progressmedia`

클라이언트 생성/수정 화면에서 공유 비밀번호를 설정하면 광고주는 비밀번호 입력 후 접근합니다.

## 무료 플랜 주의점

- 업로드는 1회 최대 100,000행으로 제한합니다.
- 대시보드는 선택 기간과 직전 비교 기간만 조회합니다.
- 테이블은 클라이언트 페이지네이션을 적용했습니다.
- PDF는 서버 생성 대신 브라우저 인쇄/저장을 사용합니다.
- 대용량 원본 파일 저장이 필요할 때만 Supabase Storage를 연결하세요.

## 향후 광고 API 연동

`src/services/connectors` 아래 placeholder를 실제 API 클라이언트로 교체하면 됩니다.

- `naver.ts`
- `google.ts`
- `meta.ts`
- `ga4.ts`
- `kakao.ts`
- `tiktok.ts`

각 connector는 외부 API 데이터를 공통 `ReportRow` 형태로 정규화한 뒤 현재 업로드 저장 흐름과 같은 upsert 서비스를 재사용하도록 확장하는 구조가 좋습니다.
