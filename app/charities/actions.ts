"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberByToken } from "@/app/me/actions";

/* ===== 타입 ===== */

export type WishItemInput = { name: string; targetCost: number };

export type NewCharityInput = {
  hostToken?: string; // 등록자(회원) — 없어도 등록 가능
  name: string;
  description: string;
  taxDeductible: boolean;
  taxNo: string;
  items: WishItemInput[];
};

export type WishItem = {
  id: string;
  name: string;
  target_cost: number;
  raised_amount: number;
  groups_count: number;
  status: string;
};

export type CharityLite = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tax_deductible: boolean;
  item_count: number;
  raised_total: number;
  target_total: number;
};

export type CharityView = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tax_deductible: boolean;
  tax_no: string | null;
  items: WishItem[];
};

/* ===== 등록 ===== */

export type CreateCharityResult =
  | { ok: true; charityId: string }
  | { ok: false; error: string };

export async function createCharity(
  input: NewCharityInput
): Promise<CreateCharityResult> {
  if (!input.name.trim()) return { ok: false, error: "기관 이름을 입력해 주세요." };
  const items = input.items
    .map((i) => ({ name: i.name.trim(), targetCost: Math.max(0, Math.floor(i.targetCost || 0)) }))
    .filter((i) => i.name && i.targetCost > 0);
  if (items.length === 0)
    return { ok: false, error: "위시리스트 품목을 1개 이상(품목명·예상비용) 입력해 주세요." };

  try {
    const db = createAdminClient();
    let createdBy: string | null = null;
    if (input.hostToken) {
      const m = await getMemberByToken(input.hostToken);
      createdBy = m?.id ?? null;
    }

    const { data: charity, error } = await db
      .from("charity")
      .insert({
        name: input.name.trim(),
        description: input.description.trim() || null,
        tax_deductible: input.taxDeductible,
        tax_no: input.taxDeductible ? input.taxNo.trim() || null : null,
        created_by_member_id: createdBy,
        status: "pending",
      })
      .select("id")
      .single();
    if (error || !charity) return { ok: false, error: error?.message || "등록 실패" };

    await db.from("wishlist_item").insert(
      items.map((i) => ({
        charity_id: charity.id,
        name: i.name,
        target_cost: i.targetCost,
      }))
    );

    return { ok: true, charityId: charity.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "등록 중 오류" };
  }
}

/* ===== 목록 ===== */

async function toLite(db: ReturnType<typeof createAdminClient>, rows: any[]): Promise<CharityLite[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const { data: items } = await db
    .from("wishlist_item")
    .select("charity_id, target_cost, raised_amount")
    .in("charity_id", ids);
  const agg: Record<string, { count: number; raised: number; target: number }> = {};
  (items || []).forEach((it: any) => {
    const a = (agg[it.charity_id] ||= { count: 0, raised: 0, target: 0 });
    a.count += 1;
    a.raised += it.raised_amount || 0;
    a.target += it.target_cost || 0;
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    status: r.status,
    tax_deductible: r.tax_deductible,
    item_count: agg[r.id]?.count || 0,
    raised_total: agg[r.id]?.raised || 0,
    target_total: agg[r.id]?.target || 0,
  }));
}

export async function listCharities(): Promise<CharityLite[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("charity")
      .select("id, name, description, status, tax_deductible")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    return await toLite(db, data || []);
  } catch {
    return [];
  }
}

export async function listPendingCharities(): Promise<CharityLite[]> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("charity")
      .select("id, name, description, status, tax_deductible")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    return await toLite(db, data || []);
  } catch {
    return [];
  }
}

export async function approveCharity(id: string): Promise<{ ok: boolean }> {
  try {
    const db = createAdminClient();
    await db
      .from("charity")
      .update({ status: "approved", approved_by: "operator", approved_at: new Date().toISOString() })
      .eq("id", id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function rejectCharity(id: string): Promise<{ ok: boolean }> {
  try {
    const db = createAdminClient();
    await db.from("charity").update({ status: "rejected" }).eq("id", id);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function getCharity(id: string): Promise<CharityView | null> {
  try {
    const db = createAdminClient();
    const { data: c } = await db
      .from("charity")
      .select("id, name, description, status, tax_deductible, tax_no")
      .eq("id", id)
      .maybeSingle();
    if (!c) return null;
    const { data: items } = await db
      .from("wishlist_item")
      .select("id, name, target_cost, raised_amount, groups_count, status")
      .eq("charity_id", id)
      .order("created_at", { ascending: true });
    return { ...(c as any), items: (items || []) as WishItem[] };
  } catch {
    return null;
  }
}

/* ===== 기부하기(정산액 → 위시리스트 반영) ===== */

export type RoundAllocation = {
  fundingId: string;
  itemId: string;
  itemName: string;
  charityName: string;
  amount: number;
};

export type RoundDonateInfo = {
  roundId: string;
  roundName: string;
  total: number; // 라운드 총 기부금
  allocated: number; // 이미 배분한 금액
  remaining: number; // 남은 배분액(잔액)
  allocations: RoundAllocation[]; // 이 라운드에서 이미 배분한 내역
};

/** 기부하기 화면용: 라운드 총액 + 배분 잔액 + 이미 배분한 내역 */
export async function getRoundDonateInfo(roundId: string): Promise<RoundDonateInfo | null> {
  try {
    const db = createAdminClient();
    const [{ data: round }, { data: logs }, { data: fundings }] = await Promise.all([
      db.from("round").select("id, name").eq("id", roundId).maybeSingle(),
      db.from("donation_log").select("amount").eq("round_id", roundId),
      db.from("funding").select("id, wishlist_item_id, amount").eq("round_id", roundId),
    ]);
    if (!round) return null;
    const total = (logs || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
    const allocated = (fundings || []).reduce((s: number, f: any) => s + (f.amount || 0), 0);

    // 배분 내역의 품목/기부처 이름
    const allocations: RoundAllocation[] = [];
    if (fundings && fundings.length) {
      const itemIds = [...new Set(fundings.map((f: any) => f.wishlist_item_id))];
      const { data: items } = await db
        .from("wishlist_item")
        .select("id, name, charity_id")
        .in("id", itemIds);
      const itemName: Record<string, string> = {};
      const itemCharity: Record<string, string> = {};
      (items || []).forEach((it: any) => {
        itemName[it.id] = it.name;
        itemCharity[it.id] = it.charity_id;
      });
      const cids = [...new Set(Object.values(itemCharity))];
      const charityName: Record<string, string> = {};
      if (cids.length) {
        const { data: cs } = await db.from("charity").select("id, name").in("id", cids);
        (cs || []).forEach((c: any) => (charityName[c.id] = c.name));
      }
      fundings.forEach((f: any) => {
        allocations.push({
          fundingId: f.id,
          itemId: f.wishlist_item_id,
          itemName: itemName[f.wishlist_item_id] || "위시리스트",
          charityName: charityName[itemCharity[f.wishlist_item_id]] || "기부처",
          amount: f.amount,
        });
      });
    }

    return {
      roundId: round.id,
      roundName: round.name,
      total,
      allocated,
      remaining: Math.max(0, total - allocated),
      allocations,
    };
  } catch {
    return null;
  }
}

export type FundResult =
  | {
      ok: true;
      itemStatus: string;
      raised: number;
      target: number;
      charityId: string;
      itemId: string;
      contributed: number; // 이번에 실제 넣은 금액
      remaining: number; // 이 라운드의 남은 배분 잔액
    }
  | { ok: false; error: string };

/**
 * 라운드 기부금의 일부(amount)를 한 위시리스트에 반영(자동 채우기).
 * amount 미지정 시 min(잔액, 위시리스트에 필요한 금액)만큼 자동 배분.
 */
export async function fundWishlist(input: {
  roundId: string;
  wishlistItemId: string;
  amount?: number;
}): Promise<FundResult> {
  try {
    const db = createAdminClient();

    const [{ data: round }, { data: logs }, { data: prevFundings }, { data: item }] = await Promise.all([
      db.from("round").select("id, meeting_id").eq("id", input.roundId).maybeSingle(),
      db.from("donation_log").select("round_player_id, amount").eq("round_id", input.roundId),
      db.from("funding").select("amount").eq("round_id", input.roundId),
      db
        .from("wishlist_item")
        .select("id, charity_id, target_cost, raised_amount, groups_count")
        .eq("id", input.wishlistItemId)
        .maybeSingle(),
    ]);
    if (!round) return { ok: false, error: "라운드를 찾을 수 없어요." };
    if (!item) return { ok: false, error: "위시리스트 품목을 찾을 수 없어요." };

    const total = (logs || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
    if (total <= 0) return { ok: false, error: "적립된 기부금이 없습니다." };
    const already = (prevFundings || []).reduce((s: number, f: any) => s + (f.amount || 0), 0);
    const remainingBalance = total - already;
    if (remainingBalance <= 0) return { ok: false, error: "이미 전액 배분되었습니다." };

    const need = Math.max(0, item.target_cost - (item.raised_amount || 0));
    // 요청 금액이 없으면 자동 채우기(잔액과 필요액 중 작은 값)
    let amt = input.amount != null ? Math.floor(input.amount) : Math.min(remainingBalance, need || remainingBalance);
    if (amt <= 0) return { ok: false, error: "넣을 금액이 없습니다." };
    if (amt > remainingBalance) amt = remainingBalance; // 잔액 초과 방지

    // 펀딩(장부) 기록
    const { data: funding, error: fErr } = await db
      .from("funding")
      .insert({
        wishlist_item_id: item.id,
        meeting_id: round.meeting_id || null,
        round_id: round.id,
        amount: amt,
      })
      .select("id")
      .single();
    if (fErr || !funding) return { ok: false, error: fErr?.message || "기부 기록 실패" };

    // 개인별 명단(회원만) — 라운드 총액 기준 비례 분배(최대잔여 반올림으로 합계 정확히 amt)
    const { data: players } = await db
      .from("round_player")
      .select("id, member_id")
      .eq("round_id", input.roundId);
    const memberOf: Record<string, string | null> = {};
    (players || []).forEach((p: any) => (memberOf[p.id] = p.member_id));
    const perMember: Record<string, number> = {};
    (logs || []).forEach((l: any) => {
      const mid = memberOf[l.round_player_id];
      if (mid) perMember[mid] = (perMember[mid] || 0) + (l.amount || 0);
    });
    const entries = Object.entries(perMember).filter(([, v]) => v > 0);
    const split = largestRemainder(entries.map(([, v]) => v), amt);
    const fmRows = entries
      .map(([member_id], i) => ({ funding_id: funding.id, member_id, amount: split[i] }))
      .filter((r) => r.amount > 0);
    if (fmRows.length) await db.from("funding_member").insert(fmRows);

    // 위시리스트 진행율 갱신
    const rawRaised = (item.raised_amount || 0) + amt;
    const completed = rawRaised >= item.target_cost;
    const raised = Math.min(rawRaised, item.target_cost);
    await db
      .from("wishlist_item")
      .update({
        raised_amount: raised,
        groups_count: (item.groups_count || 0) + 1,
        status: completed ? "completed" : "open",
        completed_at: completed ? new Date().toISOString() : null,
      })
      .eq("id", item.id);

    return {
      ok: true,
      itemStatus: completed ? "completed" : "open",
      raised,
      target: item.target_cost,
      charityId: item.charity_id,
      itemId: item.id,
      contributed: amt,
      remaining: remainingBalance - amt,
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "기부 처리 오류" };
  }
}

/** 비례 배분 + 최대잔여법으로 정수 합계를 target에 정확히 맞춤 */
function largestRemainder(weights: number[], target: number): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (sum <= 0 || target <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (w / sum) * target);
  const floor = raw.map((x) => Math.floor(x));
  let rem = target - floor.reduce((s, x) => s + x, 0);
  const order = raw
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floor];
  for (let k = 0; k < order.length && rem > 0; k++, rem--) out[order[k].i] += 1;
  return out;
}

/** 기부하기 화면용: 승인된 기부처 + 열린 위시리스트 품목만 */
export type OpenCharity = {
  id: string;
  name: string;
  tax_deductible: boolean;
  items: WishItem[];
};

export async function listOpenWishlists(): Promise<OpenCharity[]> {
  try {
    const db = createAdminClient();
    const { data: charities } = await db
      .from("charity")
      .select("id, name, tax_deductible")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (!charities || !charities.length) return [];
    const ids = charities.map((c: any) => c.id);
    const { data: items } = await db
      .from("wishlist_item")
      .select("id, charity_id, name, target_cost, raised_amount, groups_count, status")
      .in("charity_id", ids)
      .eq("status", "open")
      .order("created_at", { ascending: true });
    const byCharity: Record<string, WishItem[]> = {};
    (items || []).forEach((it: any) => {
      (byCharity[it.charity_id] ||= []).push({
        id: it.id,
        name: it.name,
        target_cost: it.target_cost,
        raised_amount: it.raised_amount,
        groups_count: it.groups_count,
        status: it.status,
      });
    });
    return charities
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        tax_deductible: c.tax_deductible,
        items: byCharity[c.id] || [],
      }))
      .filter((c: OpenCharity) => c.items.length > 0);
  } catch {
    return [];
  }
}
