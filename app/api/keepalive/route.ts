import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// DB 잠자기 방지용 — 하루 한 번 Vercel Cron이 호출해 가벼운 쿼리를 실행한다.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = createAdminClient();
    // 가장 가벼운 요청: member 개수만 조회(데이터는 반환 안 함)
    const { count, error } = await db
      .from("member")
      .select("id", { count: "exact", head: true });
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
    }
    return NextResponse.json({ ok: true, members: count ?? 0, ts: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "keepalive failed" },
      { status: 200 }
    );
  }
}
