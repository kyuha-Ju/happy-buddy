"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  listPendingCharities,
  approveCharity,
  rejectCharity,
  type CharityLite,
} from "@/app/charities/actions";

/** 운영자 비밀번호 검증 (Vercel 환경변수 ADMIN_PASSCODE) */
function isOperator(passcode: string): boolean {
  const real = process.env.ADMIN_PASSCODE;
  return !!real && passcode === real;
}

export async function verifyAdmin(
  passcode: string
): Promise<{ ok: boolean; configured: boolean }> {
  const configured = !!process.env.ADMIN_PASSCODE;
  return { ok: isOperator(passcode), configured };
}

export type AdminData = {
  pending: CharityLite[];
  approvedCount: number;
  pendingCount: number;
  memberCount: number;
  roundCount: number;
  totalDonated: number;
};

export async function getAdminData(passcode: string): Promise<AdminData | null> {
  if (!isOperator(passcode)) return null;
  try {
    const db = createAdminClient();
    const [
      pending,
      memberRes,
      roundRes,
      approvedRes,
      { data: fundings },
    ] = await Promise.all([
      listPendingCharities(),
      db.from("member").select("id", { count: "exact", head: true }),
      db.from("round").select("id", { count: "exact", head: true }),
      db.from("charity").select("id", { count: "exact", head: true }).eq("status", "approved"),
      db.from("funding").select("amount"),
    ]);
    const totalDonated = (fundings || []).reduce((s: number, f: any) => s + (f.amount || 0), 0);
    return {
      pending,
      pendingCount: pending.length,
      approvedCount: approvedRes.count || 0,
      memberCount: memberRes.count || 0,
      roundCount: roundRes.count || 0,
      totalDonated,
    };
  } catch {
    return null;
  }
}

export async function adminApprove(
  passcode: string,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isOperator(passcode)) return { ok: false, error: "권한이 없습니다." };
  return approveCharity(id);
}

export async function adminReject(
  passcode: string,
  id: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isOperator(passcode)) return { ok: false, error: "권한이 없습니다." };
  return rejectCharity(id);
}

/* ===== 기부처 진행상황 (라이브) ===== */
export type AdminWishItem = {
  id: string;
  name: string;
  targetCost: number;
  raisedAmount: number;
  status: string;
};
export type AdminCharity = {
  id: string;
  name: string;
  items: AdminWishItem[];
};

export async function getAdminCharities(passcode: string): Promise<AdminCharity[] | null> {
  if (!isOperator(passcode)) return null;
  try {
    const db = createAdminClient();
    const { data: charities } = await db
      .from("charity")
      .select("id, name")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (!charities || !charities.length) return [];
    const ids = charities.map((c: any) => c.id);
    const { data: items } = await db
      .from("wishlist_item")
      .select("id, charity_id, name, target_cost, raised_amount, status")
      .in("charity_id", ids)
      .order("created_at", { ascending: true });
    const byCharity: Record<string, AdminWishItem[]> = {};
    (items || []).forEach((it: any) => {
      (byCharity[it.charity_id] ||= []).push({
        id: it.id,
        name: it.name,
        targetCost: it.target_cost,
        raisedAmount: it.raised_amount,
        status: it.status,
      });
    });
    return charities.map((c: any) => ({ id: c.id, name: c.name, items: byCharity[c.id] || [] }));
  } catch {
    return null;
  }
}

/* ===== 기부자 명단 (완주 위시리스트 → 영수증 소스) ===== */
export type DonorRow = { name: string; phone: string; amount: number };
export type WishlistDonors = {
  itemName: string;
  charityName: string;
  target: number;
  raised: number;
  donors: DonorRow[];
};

export async function getWishlistDonors(
  passcode: string,
  wishlistItemId: string
): Promise<WishlistDonors | null> {
  if (!isOperator(passcode)) return null;
  try {
    const db = createAdminClient();
    const { data: item } = await db
      .from("wishlist_item")
      .select("id, name, charity_id, target_cost, raised_amount")
      .eq("id", wishlistItemId)
      .maybeSingle();
    if (!item) return null;
    const { data: charity } = await db
      .from("charity")
      .select("name")
      .eq("id", item.charity_id)
      .maybeSingle();

    const { data: fundings } = await db
      .from("funding")
      .select("id")
      .eq("wishlist_item_id", wishlistItemId);
    const fundingIds = (fundings || []).map((f: any) => f.id);
    const perMember: Record<string, number> = {};
    if (fundingIds.length) {
      const { data: fm } = await db
        .from("funding_member")
        .select("member_id, amount")
        .in("funding_id", fundingIds);
      (fm || []).forEach((x: any) => {
        perMember[x.member_id] = (perMember[x.member_id] || 0) + (x.amount || 0);
      });
    }
    const mids = Object.keys(perMember);
    const nameOf: Record<string, string> = {};
    const phoneOf: Record<string, string> = {};
    if (mids.length) {
      const { data: ms } = await db.from("member").select("id, name, phone").in("id", mids);
      (ms || []).forEach((m: any) => {
        nameOf[m.id] = m.name;
        phoneOf[m.id] = m.phone;
      });
    }
    const donors: DonorRow[] = mids
      .map((id) => ({ name: nameOf[id] || "회원", phone: phoneOf[id] || "", amount: perMember[id] }))
      .sort((a, b) => b.amount - a.amount);

    return {
      itemName: item.name,
      charityName: charity?.name || "기부처",
      target: item.target_cost,
      raised: item.raised_amount,
      donors,
    };
  } catch {
    return null;
  }
}

/* ===== 일자별·회원별 입금 관리 ===== */
export type DepositMember = { name: string; amount: number; isMember: boolean };
export type DepositRound = {
  id: string;
  name: string;
  course: string | null;
  playDate: string | null;
  total: number;
  members: DepositMember[];
};

export async function getDepositSchedule(passcode: string): Promise<DepositRound[] | null> {
  if (!isOperator(passcode)) return null;
  try {
    const db = createAdminClient();
    const { data: rounds } = await db
      .from("round")
      .select("id, name, course, play_date, created_at")
      .order("play_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (!rounds || !rounds.length) return [];
    const roundIds = rounds.map((r: any) => r.id);

    const [{ data: players }, { data: logs }] = await Promise.all([
      db.from("round_player").select("id, round_id, display_name, member_id").in("round_id", roundIds),
      db.from("donation_log").select("round_id, round_player_id, amount").in("round_id", roundIds),
    ]);
    const playerInfo: Record<string, { round: string; name: string; isMember: boolean }> = {};
    (players || []).forEach((p: any) => {
      playerInfo[p.id] = { round: p.round_id, name: p.display_name, isMember: !!p.member_id };
    });
    // round -> player -> amount
    const byRoundPlayer: Record<string, Record<string, number>> = {};
    (logs || []).forEach((l: any) => {
      (byRoundPlayer[l.round_id] ||= {});
      byRoundPlayer[l.round_id][l.round_player_id] =
        (byRoundPlayer[l.round_id][l.round_player_id] || 0) + (l.amount || 0);
    });

    const out: DepositRound[] = [];
    rounds.forEach((r: any) => {
      const pm = byRoundPlayer[r.id];
      if (!pm) return; // 적립 없는 라운드는 제외
      const members: DepositMember[] = Object.entries(pm).map(([pid, amt]) => ({
        name: playerInfo[pid]?.name || "선수",
        amount: amt,
        isMember: playerInfo[pid]?.isMember ?? false,
      }));
      members.sort((a, b) => b.amount - a.amount);
      const total = members.reduce((s, m) => s + m.amount, 0);
      if (total <= 0) return;
      out.push({
        id: r.id,
        name: r.name,
        course: r.course,
        playDate: r.play_date,
        total,
        members,
      });
    });
    return out;
  } catch {
    return null;
  }
}
