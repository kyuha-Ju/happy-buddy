# 해피버디 (Happy Buddy)

골프 라운드에서 룰(기쁨기부/회복기부)대로 모아 **기부**하는 웹 서비스.
프론트 **Next.js(App Router) + Vercel**, 백엔드 **Supabase(Postgres/Realtime/Storage)**.

> 설계 원칙 — 플랫폼은 **자금을 보관·중개하지 않고(장부만)**, **주민번호를 저장하지 않습니다.**
> 상세 기획/법령/영수증/데이터 모델은 프로젝트 문서(해피버디_기획정리 / _법령체크 / _영수증체크 / _개발명세)를 참조.

## 폴더 구조
```
app/                 # 라우트(App Router)
  page.tsx           # 홈
  me/                # 회원가입·내 정보
  charities/         # 기부처 목록/등록/상세
  rounds/            # 방 만들기/룰/QR/진행/정산/기부하기
  join/[token]/      # QR·코드 입장 라우팅
  nanum/             # 나눔 완료
components/          # 공용 컴포넌트
lib/supabase/        # Supabase 클라이언트(브라우저/서버)
supabase/migrations/ # DB 스키마 SQL
```
현재는 **뼈대(스캐폴딩)** 단계 — 홈은 실제 UI, 나머지 화면은 라우트 확인용 자리표시입니다.

## 1) 로컬 실행
```bash
npm install
cp .env.local.example .env.local   # 값 채우기(아래 2번)
npm run dev                        # http://localhost:3000
```

## 2) Supabase 설정
1. https://supabase.com 에서 새 프로젝트 생성(무료).
2. **SQL Editor**에 `supabase/migrations/0001_init.sql` 붙여넣고 실행 → 테이블 생성.
3. **Project Settings > API**에서 값 복사해 `.env.local`에 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (서버 전용, 절대 공개 금지)
> ⚠️ 스키마의 RLS는 개발 편의용(공개 읽기)입니다. **실서비스 전 쓰기 정책을 반드시 강화**하세요.

## 3) GitHub 올리기
```bash
git init
git add -A
git commit -m "chore: 해피버디 초기 뼈대 (Next.js + Supabase)"
git branch -M main
git remote add origin https://github.com/<계정>/happybuddy.git
git push -u origin main
```

## 4) Vercel 배포
1. https://vercel.com → **Add New > Project** → 위 GitHub 레포 선택.
2. Environment Variables에 `.env.local`의 값 3개 입력.
3. Deploy → 자동 빌드/배포. 이후 `main`에 push하면 자동 재배포.
4. 도메인 연결: Vercel 프로젝트 **Settings > Domains**에서 구매한 도메인 추가.

## 다음 개발 마일스톤
- **M1** 회원가입/모임/방 만들기(이름검색)
- **M2** 입장(QR/코드) + 진행(방식 B, Realtime) + 정산
- **M3** 기부처 등록/승인 + 위시리스트 진행율 + 기부하기
- **M4** 나눔 완료/기부내역 + 개인별 명단 export + 영수증 연동
- **M5** 배포·QA·개인정보/보안 점검
