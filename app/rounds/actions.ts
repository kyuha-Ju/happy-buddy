"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberByToken } from "@/app/me/actions";

export type RoundEventInput = {
  name: string;
  amount: number;
  kind: "joy" | "recover";
  enabled: boolean;
  custom?: boolean;
};

export type NewRoundInput = {
  hostToken: string;
  course: string;
  name: string;
  playDate: string; // "yyyy-mm-dd" | ""
  participants: string[]; // 비회원 참석자 이름(placeholder)
  events: RoundEventInput[];
};

export type CreateResult =
  | { ok: true; roundId: string; joinCode: string; qrToken: string }
  | { ok: false; error: string };

function code4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function createRound(input: NewRoundInput): Promise<CreateResult> {
  const host = await getMemberByToken(input.hostToken);
  if (!host) return { ok: false, error: "로그인이 필요합니다. 먼저 로그인해 주세요." };
  if (!input.course.trim()) return { ok: false, error: "골프장(구장)을 입력해 주세요." };

  try {
    const db = createAdminClient();

    // 입장 코드(가능한 한 중복 회피)
    let joinCode = code4();
    for (let i = 0; i < 5; i++) {
      const { data } = await db.from("round").select("id").eq("join_code", joinCode).limit(1);
      if (!data || data.length === 0) break;
      joinCode = code4();
    }

    const { data: round, error } = await db
      .from("round")
      .insert({
        host_member_id: host.id,
        course: input.course.trim(),
        name: input.name.trim() || "정기 라운드",
        play_date: input.playDate || null,
        join_code: joinCode,
        input_mode: "B",
        status: "setup",
      })
      .select("id, join_code, qr_token")
      .single();
    if (error || !round) return { ok: false, error: error?.message || "라운드 생성 실패" };

    const events = input.events.filter((e) => e.enabled && e.name.trim());
    if (events.length) {
      await db.from("round_event").insert(
        events.map((e) => ({
          round_id: round.id,
          name: e.name.trim(),
          amount: Math.max(0, e.amount || 0),
          kind: e.kind,
          enabled: true,
        }))
      );
    }

    const players: {
      round_id: string;
      member_id: string | null;
      display_name: string;
      joined_via: string;
    }[] = [
      { round_id: round.id, member_id: host.id, display_name: host.name, joined_via: "host" },
    ];
    input.participants
      .filter((n) => n.trim())
      .forEach((n) =>
        players.push({ round_id: round.id, member_id: null, display_name: n.trim(), joined_via: "host" })
      );
    await db.from("round_player").insert(players);

    return { ok: true, roundId: round.id, joinCode: round.join_code, qrToken: round.qr_token };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "생성 중 오류" };
  }
}

export type RoundView = {
  id: string;
  name: string;
  course: string | null;
  play_date: string | null;
  join_code: string;
  qr_token: string;
  status: string;
  host_member_id: string | null;
  players: { id: string; display_name: string; member_id: string | null; joined_via: string | null }[];
  events: { name: string; amount: number; kind: string }[];
};

export async function getRound(arg: { id?: string; token?: string }): Promise<RoundView | null> {
  try {
    const db = createAdminClient();
    const base = db
      .from("round")
      .select("id, name, course, play_date, join_code, qr_token, status, host_member_id");
    const { data } = arg.id
      ? await base.eq("id", arg.id).maybeSingle()
      : await base.eq("qr_token", arg.token as string).maybeSingle();
    if (!data) return null;
    const { data: players } = await db
      .from("round_player")
      .select("id, display_name, member_id, joined_via")
      .eq("round_id", data.id)
      .order("joined_via", { ascending: true });
    const { data: events } = await db
      .from("round_event")
      .select("name, amount, kind")
      .eq("round_id", data.id)
      .eq("enabled", true);
    return { ...(data as any), players: players || [], events: events || [] };
  } catch {
    return null;
  }
}

/** 입장 코드 → qr_token 변환(입장 화면 재사용) */
export async function getRoundTokenByCode(code: string): Promise<string | null> {
  const c = (code || "").replace(/[^0-9]/g, "");
  if (c.length !== 4) return null;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("round")
      .select("qr_token")
      .eq("join_code", c)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.qr_token ?? null;
  } catch {
    return null;
  }
}

export type JoinResult =
  | { ok: true; roundId: string; roundName: string }
  | { ok: false; needSignup?: true; error?: string };

export async function joinRound(token: string, memberToken: string): Promise<JoinResult> {
  const member = await getMemberByToken(memberToken);
  if (!member) return { ok: false, needSignup: true };
  try {
    const db = createAdminClient();
    const { data: round } = await db
      .from("round")
      .select("id, name")
      .eq("qr_token", token)
      .maybeSingle();
    if (!round) return { ok: false, error: "라운드를 찾을 수 없어요." };

    const { data: existing } = await db
      .from("round_player")
      .select("id")
      .eq("round_id", round.id)
      .eq("member_id", member.id)
      .maybeSingle();
    if (!existing) {
      await db.from("round_player").insert({
        round_id: round.id,
        member_id: member.id,
        display_name: member.name,
        joined_via: "qr",
      });
    }
    return { ok: true, roundId: round.id, roundName: round.name };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "입장 실패" };
  }
}
