"use server";

import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type Member = {
  id: string;
  name: string;
  phone: string;
  receipt_optin: boolean;
  device_token: string | null;
};

export type SaveResult =
  | { ok: true; member: Member }
  | { ok: false; error: string };

/** 전화번호를 숫자만 남겨 정규화(식별 키 안정화) */
function normalizePhone(raw: string) {
  return (raw || "").replace(/[^0-9]/g, "");
}

/**
 * 회원 저장(무인증). 전화번호를 키로 upsert.
 * 주민번호는 저장하지 않음 — receipt_optin(신청 여부)만 기록.
 */
export async function saveMember(input: {
  name: string;
  phone: string;
  receiptOptin: boolean;
  deviceToken?: string | null;
}): Promise<SaveResult> {
  const name = (input.name || "").trim();
  const phone = normalizePhone(input.phone);
  if (!name) return { ok: false, error: "이름을 입력해 주세요." };
  if (phone.length < 9) return { ok: false, error: "전화번호를 정확히 입력해 주세요." };

  try {
    const db = createAdminClient();

    const { data: existing, error: selErr } = await db
      .from("member")
      .select("*")
      .eq("phone", phone)
      .maybeSingle();
    if (selErr) return { ok: false, error: selErr.message };

    const device_token = existing?.device_token ?? input.deviceToken ?? randomUUID();

    if (existing) {
      const { data, error } = await db
        .from("member")
        .update({ name, receipt_optin: input.receiptOptin, device_token })
        .eq("id", existing.id)
        .select("id, name, phone, receipt_optin, device_token")
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, member: data as Member };
    }

    const { data, error } = await db
      .from("member")
      .insert({ name, phone, receipt_optin: input.receiptOptin, device_token })
      .select("id, name, phone, receipt_optin, device_token")
      .single();
    if (error) return { ok: false, error: error.message };
    return { ok: true, member: data as Member };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "저장 중 오류가 발생했습니다." };
  }
}

/** 기기 토큰으로 회원 조회(재방문 자동 인식) */
export async function getMemberByToken(token: string): Promise<Member | null> {
  if (!token) return null;
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("member")
      .select("id, name, phone, receipt_optin, device_token")
      .eq("device_token", token)
      .maybeSingle();
    return (data as Member) ?? null;
  } catch {
    return null;
  }
}
