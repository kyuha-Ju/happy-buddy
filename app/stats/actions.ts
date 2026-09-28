"use server";

import { createAdminClient } from "@/lib/supabase/admin";

type DB = ReturnType<typeof createAdminClient>;

/* ===== 홈 통계 ===== */
export type HomeStats = { totalDonated: number; participantCount: number };

export async function getHomeStats(): Promise<HomeStats> {
  try {
    const db = createAdminClient();
    const [{ data: fundings }, { data: fm }] = await Promise.all([
      db.from("funding").select("amount"),
      db.from("funding_member").select("member_id"),
    ]);
    const totalDonated = (fundings || []).reduce((s: number, f: any) => s + (f.amount || 0), 0);
    const participantCount = new Set((fm || []).map((x: any) => x.member_id)).size;
    return { totalDonated, participantCount };
  } catch {
    return { totalDonated: 0, participantCount: 0 };
  }
}

/* ===== 마이페이지 통계 ===== */
export type MyStats = { totalDonated: number; count: number };

export async function getMyStats(memberId: string): Promise<MyStats> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("funding_member").select("amount").eq("member_id", memberId);
    const totalDonated = (data || []).reduce((s: number, x: any) => s + (x.amount || 0), 0);
    return { totalDonated, count: (data || []).length };
  } catch {
    return { totalDonated: 0, count: 0 };
  }
}

/* ===== 나의 기부 내역 ===== */
export type MyHistoryRow = {
  id: string;
  amount: number;
  charityName: string;
  itemName: string;
  roundName: string | null;
  date: string;
};

async function fundingContext(db: DB, fundingIds: string[]) {
  if (!fundingIds.length)
    return {
      fund: {} as Record<string, any>,
      itemName: {} as Record<string, string>,
      charityName: {} as Record<string, string>,
      roundName: {} as Record<string, string>,
    };
  const { data: fundings } = await db
    .from("funding")
    .select("id, wishlist_item_id, round_id, amount, created_at")
    .in("id", fundingIds);
  const fund: Record<string, any> = {};
  const itemIds = new Set<string>();
  const roundIds = new Set<string>();
  (fundings || []).forEach((f: any) => {
    fund[f.id] = f;
    if (f.wishlist_item_id) itemIds.add(f.wishlist_item_id);
    if (f.round_id) roundIds.add(f.round_id);
  });

  const itemName: Record<string, string> = {};
  const itemCharity: Record<string, string> = {};
  if (itemIds.size) {
    const { data: items } = await db
      .from("wishlist_item")
      .select("id, name, charity_id")
      .in("id", [...itemIds]);
    (items || []).forEach((it: any) => {
      itemName[it.id] = it.name;
      itemCharity[it.id] = it.charity_id;
    });
  }
  const charityName: Record<string, string> = {};
  const charityIds = [...new Set(Object.values(itemCharity))];
  if (charityIds.length) {
    const { data: cs } = await db.from("charity").select("id, name").in("id", charityIds);
    (cs || []).forEach((c: any) => (charityName[c.id] = c.name));
  }
  const roundName: Record<string, string> = {};
  if (roundIds.size) {
    const { data: rs } = await db.from("round").select("id, name").in("id", [...roundIds]);
    (rs || []).forEach((r: any) => (roundName[r.id] = r.name));
  }
  // itemId → charityName 매핑 편의
  const itemCharityName: Record<string, string> = {};
  Object.entries(itemCharity).forEach(([iid, cid]) => (itemCharityName[iid] = charityName[cid] || ""));

  return { fund, itemName, charityName: itemCharityName, roundName };
}

export async function getMyHistory(memberId: string): Promise<MyHistoryRow[]> {
  try {
    const db = createAdminClient();
    const { data: fm } = await db
      .from("funding_member")
      .select("id, funding_id, amount")
      .eq("member_id", memberId);
    if (!fm || !fm.length) return [];
    const ctx = await fundingContext(db, fm.map((x: any) => x.funding_id));
    return fm
      .map((x: any) => {
        const f = ctx.fund[x.funding_id];
        const iid = f?.wishlist_item_id;
        return {
          id: x.id,
          amount: x.amount,
          charityName: (iid && ctx.charityName[iid]) || "기부처",
          itemName: (iid && ctx.itemName[iid]) || "위시리스트",
          roundName: f?.round_id ? ctx.roundName[f.round_id] || null : null,
          date: f?.created_at || "",
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  } catch {
    return [];
  }
}

/* ===== 함께 기부한 사람들 ===== */
export type TogetherRow = { memberId: string; name: string; sharedCount: number };

export async function getTogether(memberId: string): Promise<TogetherRow[]> {
  try {
    const db = createAdminClient();
    const { data: mine } = await db
      .from("funding_member")
      .select("funding_id")
      .eq("member_id", memberId);
    const fundingIds = [...new Set((mine || []).map((x: any) => x.funding_id))];
    if (!fundingIds.length) return [];
    const { data: others } = await db
      .from("funding_member")
      .select("member_id")
      .in("funding_id", fundingIds);
    const shared: Record<string, number> = {};
    (others || []).forEach((x: any) => {
      if (x.member_id === memberId) return;
      shared[x.member_id] = (shared[x.member_id] || 0) + 1;
    });
    const ids = Object.keys(shared);
    if (!ids.length) return [];
    const { data: members } = await db.from("member").select("id, name").in("id", ids);
    const nameOf: Record<string, string> = {};
    (members || []).forEach((m: any) => (nameOf[m.id] = m.name));
    return ids
      .map((id) => ({ memberId: id, name: nameOf[id] || "회원", sharedCount: shared[id] }))
      .sort((a, b) => b.sharedCount - a.sharedCount);
  } catch {
    return [];
  }
}

/* ===== 나눔 완료 ===== */
export type CompletedItem = {
  id: string;
  itemName: string;
  charityName: string;
  targetCost: number;
  groupsCount: number;
  completedAt: string | null;
};
export type NanumFunding = {
  id: string;
  amount: number;
  itemName: string;
  charityName: string;
  roundName: string | null;
  date: string;
  members: { name: string; amount: number }[];
};
export type NanumData = { completed: CompletedItem[]; fundings: NanumFunding[] };

export async function getNanumData(): Promise<NanumData> {
  try {
    const db = createAdminClient();

    // 완주 위시리스트
    const { data: items } = await db
      .from("wishlist_item")
      .select("id, name, charity_id, target_cost, groups_count, completed_at, status")
      .eq("status", "completed")
      .order("completed_at", { ascending: false });
    const charityIds = [...new Set((items || []).map((i: any) => i.charity_id))];

    // 최근 기부 내역
    const { data: fundings } = await db
      .from("funding")
      .select("id, wishlist_item_id, round_id, amount, created_at")
      .order("created_at", { ascending: false })
      .limit(30);

    const itemIds = new Set<string>();
    const roundIds = new Set<string>();
    (fundings || []).forEach((f: any) => {
      if (f.wishlist_item_id) itemIds.add(f.wishlist_item_id);
      if (f.round_id) roundIds.add(f.round_id);
    });
    // 완주 항목의 charity도 포함
    (items || []).forEach((i: any) => itemIds.add(i.id));

    const itemName: Record<string, string> = {};
    const itemCharity: Record<string, string> = {};
    if (itemIds.size) {
      const { data: its } = await db
        .from("wishlist_item")
        .select("id, name, charity_id")
        .in("id", [...itemIds]);
      (its || []).forEach((it: any) => {
        itemName[it.id] = it.name;
        itemCharity[it.id] = it.charity_id;
        charityIds.push(it.charity_id);
      });
    }
    const charityName: Record<string, string> = {};
    const cids = [...new Set(charityIds)];
    if (cids.length) {
      const { data: cs } = await db.from("charity").select("id, name").in("id", cids);
      (cs || []).forEach((c: any) => (charityName[c.id] = c.name));
    }
    const roundName: Record<string, string> = {};
    if (roundIds.size) {
      const { data: rs } = await db.from("round").select("id, name").in("id", [...roundIds]);
      (rs || []).forEach((r: any) => (roundName[r.id] = r.name));
    }

    // funding별 멤버 명단
    const fundingIds = (fundings || []).map((f: any) => f.id);
    const membersByFunding: Record<string, { name: string; amount: number }[]> = {};
    if (fundingIds.length) {
      const { data: fmRows } = await db
        .from("funding_member")
        .select("funding_id, member_id, amount")
        .in("funding_id", fundingIds);
      const mids = [...new Set((fmRows || []).map((x: any) => x.member_id))];
      const nameOf: Record<string, string> = {};
      if (mids.length) {
        const { data: ms } = await db.from("member").select("id, name").in("id", mids);
        (ms || []).forEach((m: any) => (nameOf[m.id] = m.name));
      }
      (fmRows || []).forEach((x: any) => {
        (membersByFunding[x.funding_id] ||= []).push({
          name: nameOf[x.member_id] || "회원",
          amount: x.amount,
        });
      });
    }

    const completed: CompletedItem[] = (items || []).map((i: any) => ({
      id: i.id,
      itemName: i.name,
      charityName: charityName[i.charity_id] || "기부처",
      targetCost: i.target_cost,
      groupsCount: i.groups_count,
      completedAt: i.completed_at,
    }));

    const fundingsOut: NanumFunding[] = (fundings || []).map((f: any) => {
      const cid = itemCharity[f.wishlist_item_id];
      return {
        id: f.id,
        amount: f.amount,
        itemName: itemName[f.wishlist_item_id] || "위시리스트",
        charityName: (cid && charityName[cid]) || "기부처",
        roundName: f.round_id ? roundName[f.round_id] || null : null,
        date: f.created_at,
        members: (membersByFunding[f.id] || []).sort((a, b) => b.amount - a.amount),
      };
    });

    return { completed, fundings: fundingsOut };
  } catch {
    return { completed: [], fundings: [] };
  }
}
