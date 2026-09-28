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

export type RoundDonateInfo = {
  roundId: string;
  roundName: string;
  total: number;
  alreadyFunded: boolean; // 이미 이 라운드로 기부했는지
  fundedItemName: string | null;
};

/** 기부하기 화면용: 라운드 정산 총액 + 이미 기부했는지 */
export async function getRoundDonateInfo(roundId: string): Promise<RoundDonateInfo | null> {
  try {
    const db = createAdminClient();
    const [{ data: round }, { data: logs }, { data: fundings }] = await Promise.all([
      db.from("round").select("id, name").eq("id", roundId).maybeSingle(),
      db.from("donation_log").select("amount").eq("round_id", roundId),
      db.from("funding").select("id, wishlist_item_id").eq("round_id", roundId).limit(1),
    ]);
    if (!round) return null;
    const total = (logs || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
    let fundedItemName: string | null = null;
    if (fundings && fundings.length) {
      const { data: it } = await db
        .from("wishlist_item")
        .select("name")
        .eq("id", fundings[0].wishlist_item_id)
        .maybeSingle();
      fundedItemName = it?.name ?? null;
    }

    return {
      roundId: round.id,
      roundName: round.name,
      total,
      alreadyFunded: !!(fundings && fundings.length),
      fundedItemName,
    };
  } catch {
    return null;
  }
}

export type FundResult =
  | { ok: true; itemStatus: string; raised: number; target: number; charityId: string; itemId: string }
  | { ok: false; error: string };

/** 라운드 정산액 전체를 하나의 위시리스트 품목에 반영 */
export async function fundWishlist(input: {
  roundId: string;
  wishlistItemId: string;
}): Promise<FundResult> {
  try {
    const db = createAdminClient();

    // 중복 방지: 이 라운드가 이미 기부했으면 막기
    const { data: dup } = await db
      .from("funding")
      .select("id")
      .eq("round_id", input.roundId)
      .limit(1);
    if (dup && dup.length) return { ok: false, error: "이미 이 라운드로 기부가 완료되었습니다." };

    // 라운드 정보(모임 연결) + 정산 로그
    const { data: round } = await db
      .from("round")
      .select("id, meeting_id")
      .eq("id", input.roundId)
      .maybeSingle();
    if (!round) return { ok: false, error: "라운드를 찾을 수 없어요." };

    const { data: logs } = await db
      .from("donation_log")
      .select("round_player_id, amount")
      .eq("round_id", input.roundId);
    const total = (logs || []).reduce((s: number, l: any) => s + (l.amount || 0), 0);
    if (total <= 0) return { ok: false, error: "적립된 기부금이 없습니다." };

    // 위시리스트 품목
    const { data: item } = await db
      .from("wishlist_item")
      .select("id, charity_id, target_cost, raised_amount, groups_count")
      .eq("id", input.wishlistItemId)
      .maybeSingle();
    if (!item) return { ok: false, error: "위시리스트 품목을 찾을 수 없어요." };

    // 펀딩(장부) 기록
    const { data: funding, error: fErr } = await db
      .from("funding")
      .insert({
        wishlist_item_id: item.id,
        meeting_id: round.meeting_id || null,
        round_id: round.id,
        amount: total,
      })
      .select("id")
      .single();
    if (fErr || !funding) return { ok: false, error: fErr?.message || "기부 기록 실패" };

    // 개인별 명단(회원만, 영수증 소스)
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
    const fmRows = Object.entries(perMember)
      .filter(([, amt]) => amt > 0)
      .map(([member_id, amount]) => ({ funding_id: funding.id, member_id, amount }));
    if (fmRows.length) await db.from("funding_member").insert(fmRows);

    // 위시리스트 진행율 갱신
    const rawRaised = (item.raised_amount || 0) + total;
    const raised = Math.min(rawRaised, item.target_cost);
    const completed = rawRaised >= item.target_cost;
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
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "기부 처리 오류" };
  }
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
