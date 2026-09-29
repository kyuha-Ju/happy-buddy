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
