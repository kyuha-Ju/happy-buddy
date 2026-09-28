-- 적립 로그에 홀 번호(1~18) 추가. 미저장 옵션이 아니라 로그에 붙는 단일 컬럼.
alter table donation_log add column if not exists hole int;
