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

export type MemberLite = { id: string; name: string; phone: string };

export type NewRoundInput = {
  hostToken: string;
  course: string;
  name: string;
  playDate: string; // "yyyy-mm-dd" | ""
  participants: { memberId: string; name: string }[]; // 검색으로 추가한 회원
  events: RoundEventInput[];
};

/** 참석자 추가용 회원 검색(이름 또는 전화번호 일부) */
export async function searchMembers(query: string): Promise<MemberLite[]> {
  const q = (query || "").trim();
  if (q.length < 1) return [];
  try {
    const db = createAdminClient();
    const digits = q.replace(/[^0-9]/g, "");
    const builder = db.from("member").select("id, name, phone").limit(8);
    const { data } =
      digits.length >= 2
        ? await builder.ilike("phone", `%${digits}%`)
        : await builder.ilike("name", `%${q}%`);
    return (data as MemberLite[]) || [];
  } catch {
    return [];
  }
}

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

    const seen = new Set<string>([host.id]);
    const players: {
      round_id: string;
      member_id: string | null;
      display_name: string;
      joined_via: string;
    }[] = [
      { round_id: round.id, member_id: host.id, display_name: host.name, joined_via: "host" },
    ];
    input.participants.forEach((p) => {
      if (!p.memberId || seen.has(p.memberId)) return;
      seen.add(p.memberId);
      players.push({ round_id: round.id, member_id: p.memberId, display_name: p.name, joined_via: "host" });
    });
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
    const [{ data: players }, { data: events }] = await Promise.all([
      db
        .from("round_player")
        .select("id, display_name, member_id, joined_via")
        .eq("round_id", data.id)
        .order("joined_via", { ascending: true }),
      db.from("round_event").select("name, amount, kind").eq("round_id", data.id).eq("enabled", true),
    ]);
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

/* ===== 경기 진행 / 정산 ===== */

export type PlayEvent = { id: string; name: string; amount: number; kind: "joy" | "recover" };
export type PlayPlayer = { id: string; display_name: string; member_id: string | null };
export type PlayLog = {
  id: string;
  player_id: string;
  event_id: string;
  amount: number;
  kind: string;
  hole: number | null;
  created_at: string;
};
export type PlayData = {
  id: string;
  name: string;
  course: string | null;
  status: string;
  players: PlayPlayer[];
  events: PlayEvent[];
  logs: PlayLog[];
};

export async function getRoundPlay(id: string): Promise<PlayData | null> {
  try {
    const db = createAdminClient();
    const [{ data: round }, { data: players }, { data: events }, { data: logs }] = await Promise.all([
      db.from("round").select("id, name, course, status").eq("id", id).maybeSingle(),
      db
        .from("round_player")
        .select("id, display_name, member_id")
        .eq("round_id", id)
        .order("joined_via", { ascending: true }),
      db
        .from("round_event")
        .select("id, name, amount, kind")
        .eq("round_id", id)
        .eq("enabled", true)
        .order("amount", { ascending: false }),
      db
        .from("donation_log")
        .select("id, round_player_id, round_event_id, amount, kind, hole, created_at")
        .eq("round_id", id)
        .order("created_at", { ascending: true }),
    ]);
    if (!round) return null;
    return {
      ...(round as any),
      players: (players || []) as PlayPlayer[],
      events: (events || []) as PlayEvent[],
      logs: (logs || []).map((l: any) => ({
        id: l.id,
        player_id: l.round_player_id,
        event_id: l.round_event_id,
        amount: l.amount,
        kind: l.kind,
        hole: l.hole ?? null,
        created_at: l.created_at,
      })),
    };
  } catch {
    return null;
  }
}

export async function addDonation(input: {
  roundId: string;
  playerId: string;
  eventId: string;
  amount: number;
  kind: "joy" | "recover";
  hole?: number | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const db = createAdminClient();
    const { data, error } = await db
      .from("donation_log")
      .insert({
        round_id: input.roundId,
        round_player_id: input.playerId,
        round_event_id: input.eventId,
        amount: input.amount,
        kind: input.kind,
        hole: input.hole ?? null,
        created_by: "operator",
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, error: error?.message || "적립 실패" };
    return { ok: true, id: data.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "적립 실패" };
  }
}

export async function deleteDonation(logId: string): Promise<{ ok: boolean }> {
  try {
    const db = createAdminClient();
    await db.from("donation_log").delete().eq("id", logId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function markSettled(id: string): Promise<{ ok: boolean }> {
  try {
    const db = createAdminClient();
    await db.from("round").update({ status: "settled" }).eq("id", id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
