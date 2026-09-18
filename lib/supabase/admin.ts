import { createClient } from "@supabase/supabase-js";

/**
 * 서버 전용 관리자 클라이언트 (service_role 키).
 * RLS를 우회하므로 절대 클라이언트에 노출 금지 — 서버 액션/라우트 핸들러에서만 사용.
 * member/funding/receipt 등 민감 테이블 쓰기는 이 클라이언트 경유.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)가 설정되지 않았습니다.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
