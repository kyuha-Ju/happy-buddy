-- 해피버디 초기 스키마 (개발명세 v1.1 기준)
-- 원칙: 플랫폼은 자금 미보관(금액/진행율은 장부), 주민번호 미보관.
-- Supabase SQL Editor 또는 supabase db push 로 실행.

create extension if not exists "pgcrypto";

-- ── 회원 ─────────────────────────────────────────────
-- 무인증: 전화번호를 식별 키로. 주민번호(rrn) 컬럼 없음(개인정보보호법 §24조의2).
create table if not exists member (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  phone         text not null unique,
  receipt_optin boolean not null default false,   -- 영수증 신청 여부(주민번호는 저장 안 함)
  device_token  text,                             -- 기기 자동 인식용
  created_at    timestamptz not null default now()
);

-- ── 모임 ─────────────────────────────────────────────
create table if not exists meeting (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  owner_member_id  uuid references member(id) on delete set null,
  created_at       timestamptz not null default now()
);

create table if not exists meeting_member (
  meeting_id uuid not null references meeting(id) on delete cascade,
  member_id  uuid not null references member(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','member')),
  joined_at  timestamptz not null default now(),
  primary key (meeting_id, member_id)
);

-- ── 라운드 ───────────────────────────────────────────
create table if not exists round (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid references meeting(id) on delete set null,
  name            text not null,
  course          text,
  play_date       date,
  host_member_id  uuid references member(id) on delete set null,
  join_code       char(4) not null,               -- 입장 코드
  qr_token        uuid not null default gen_random_uuid() unique,
  input_mode      text not null default 'B' check (input_mode in ('A','B')),
  status          text not null default 'setup' check (status in ('setup','playing','settled','closed')),
  created_at      timestamptz not null default now()
);
create index if not exists idx_round_join_code on round(join_code);

create table if not exists round_event (
  id        uuid primary key default gen_random_uuid(),
  round_id  uuid not null references round(id) on delete cascade,
  name      text not null,                         -- 버디/이글/OB…
  amount    int  not null check (amount >= 0),
  kind      text not null check (kind in ('joy','recover')),
  enabled   boolean not null default true
);

create table if not exists round_player (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references round(id) on delete cascade,
  member_id     uuid references member(id) on delete set null,  -- 게스트 허용(null)
  display_name  text not null,
  status        text not null default 'joined',
  joined_via    text check (joined_via in ('qr','search','host')),
  created_at    timestamptz not null default now()
);

-- ── 적립 로그(진행 중) ───────────────────────────────
create table if not exists donation_log (
  id              uuid primary key default gen_random_uuid(),
  round_id        uuid not null references round(id) on delete cascade,
  round_player_id uuid not null references round_player(id) on delete cascade,
  round_event_id  uuid not null references round_event(id) on delete cascade,
  amount          int  not null,
  kind            text not null check (kind in ('joy','recover')),
  created_by      text,                            -- operator(host/caddie)
  created_at      timestamptz not null default now()
);
create index if not exists idx_donation_log_round on donation_log(round_id);

-- ── 기부처 ───────────────────────────────────────────
create table if not exists charity (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  description         text,
  status              text not null default 'pending' check (status in ('pending','approved','rejected')),
  tax_deductible      boolean not null default false,   -- 세액공제 가능(기부처 자기 기재)
  tax_no              text,
  created_by_member_id uuid references member(id) on delete set null,
  approved_by         text,
  approved_at         timestamptz,
  created_at          timestamptz not null default now()
);

create table if not exists wishlist_item (
  id           uuid primary key default gen_random_uuid(),
  charity_id   uuid not null references charity(id) on delete cascade,
  name         text not null,
  target_cost  int  not null check (target_cost > 0),
  raised_amount int not null default 0,
  groups_count int not null default 0,
  status       text not null default 'open' check (status in ('open','completed')),
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_wishlist_charity on wishlist_item(charity_id);

-- ── 기부하기(펀딩=장부) ──────────────────────────────
create table if not exists funding (
  id               uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references wishlist_item(id) on delete cascade,
  meeting_id       uuid references meeting(id) on delete set null,
  round_id         uuid references round(id) on delete set null,
  amount           int not null check (amount > 0),
  created_at       timestamptz not null default now()
);

-- 개인별 기부 명단(영수증 소스): 이름·연락처·금액. 주민번호 없음.
create table if not exists funding_member (
  id         uuid primary key default gen_random_uuid(),
  funding_id uuid not null references funding(id) on delete cascade,
  member_id  uuid not null references member(id) on delete cascade,
  amount     int not null check (amount > 0)
);

-- ── 영수증(연동 예정) ────────────────────────────────
-- 실제 발급은 기부처가 홈택스 전자기부금영수증으로(휴대전화번호 방식). 여기선 상태만 추적.
create table if not exists receipt (
  id                uuid primary key default gen_random_uuid(),
  funding_member_id uuid not null references funding_member(id) on delete cascade,
  charity_id        uuid references charity(id) on delete set null,
  member_id         uuid references member(id) on delete set null,
  amount            int not null,
  status            text not null default 'pending' check (status in ('pending','requested','issued')),
  issued_at         timestamptz,
  hometax_ref       text
);

-- ── 나눔 완료(전달 후기) ─────────────────────────────
create table if not exists nanum (
  id               uuid primary key default gen_random_uuid(),
  wishlist_item_id uuid not null references wishlist_item(id) on delete cascade,
  photo_url        text,
  message          text,
  completed_at     timestamptz not null default now()
);

-- ── RLS (MVP: 공개 읽기 + 쓰기 최소 오픈, 운영 전 반드시 강화) ──
-- 주의: 아래는 개발 편의용. 실서비스 전 operator 토큰/서버 액션 기반으로 쓰기 정책을 좁혀야 함.
alter table member         enable row level security;
alter table meeting        enable row level security;
alter table meeting_member enable row level security;
alter table round          enable row level security;
alter table round_event    enable row level security;
alter table round_player   enable row level security;
alter table donation_log   enable row level security;
alter table charity        enable row level security;
alter table wishlist_item  enable row level security;
alter table funding        enable row level security;
alter table funding_member enable row level security;
alter table receipt        enable row level security;
alter table nanum          enable row level security;

-- 공개 읽기(승인된 기부처/위시리스트/진행율/나눔 등은 누구나 조회)
do $$
declare t text;
begin
  foreach t in array array[
    'charity','wishlist_item','nanum','round','round_event','round_player','donation_log'
  ] loop
    execute format('drop policy if exists %I on %I;', t||'_read', t);
    execute format('create policy %I on %I for select using (true);', t||'_read', t);
  end loop;
end $$;

-- TODO(운영 전): member/funding/receipt는 서버 액션(service role) 경유로만 쓰기,
-- donation_log 쓰기는 라운드 operator 검증(Edge Function), 개인정보 테이블은 select 제한.
