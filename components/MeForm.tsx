"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { saveMember, getMemberByToken, type Member } from "@/app/me/actions";

const TOKEN_KEY = "hb_device_token";

function formatPhone(raw: string) {
  const d = (raw || "").replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function MeForm() {
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<Member | null>(null);
  const [editing, setEditing] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [receiptOptin, setReceiptOptin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!token) {
      setLoading(false);
      return;
    }
    getMemberByToken(token).then((m) => {
      if (m) {
        setMember(m);
        setName(m.name);
        setPhone(formatPhone(m.phone));
        setReceiptOptin(m.receipt_optin);
      }
      setLoading(false);
    });
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {}
    startTransition(async () => {
      const res = await saveMember({ name, phone, receiptOptin, deviceToken: token });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        if (res.member.device_token) localStorage.setItem(TOKEN_KEY, res.member.device_token);
      } catch {}
      setMember(res.member);
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2200);
    });
  }

  if (loading) {
    return <div className="mt-6 text-center text-sm text-muted">불러오는 중…</div>;
  }

  // 저장된 회원 + 편집 아님 → 프로필 보기
  if (member && !editing) {
    return (
      <div>
        {savedFlash ? (
          <div className="mt-4 rounded-xl bg-[#E7F0E9] px-4 py-3 text-sm font-bold text-joy">
            ✓ 저장되었습니다
          </div>
        ) : null}
        <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <div className="text-[13px] font-black text-forest">내 정보</div>
          <Row label="이름" value={member.name} />
          <Row label="전화번호" value={formatPhone(member.phone)} />
          <Row
            label="기부영수증"
            value={member.receipt_optin ? "신청함" : "신청 안 함"}
          />
        </div>
        <p className="mt-3 px-1 text-[11.5px] leading-relaxed text-muted">
          인증 없이 이름·전화번호만으로 가입됩니다. 주민번호는 저장하지 않으며,
          영수증은 세액공제 가능 기부처가 홈택스 휴대전화번호 방식으로 발급합니다.
        </p>
        <button
          onClick={() => setEditing(true)}
          className="mt-4 w-full rounded-2xl bg-[#E4E9E1] p-4 text-[15px] font-extrabold text-forest"
        >
          정보 수정
        </button>
        <Link
          href="/"
          className="mt-2 block w-full rounded-2xl p-3 text-center text-sm font-bold text-muted"
        >
          홈으로
        </Link>
      </div>
    );
  }

  // 폼 (신규 또는 수정)
  return (
    <form onSubmit={onSubmit}>
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">기본 정보</div>
        <Field label="이름">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 지훈"
            className="w-full bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:text-muted/60"
          />
        </Field>
        <Field label="전화번호">
          <input
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            inputMode="numeric"
            placeholder="010-0000-0000"
            className="w-full bg-transparent text-right text-sm font-semibold text-ink outline-none placeholder:text-muted/60"
          />
        </Field>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">기부영수증</div>
        <p className="mt-1 text-[11.5px] text-muted">
          세액공제용 기부영수증을 받으시려면 체크하세요.
        </p>
        <button
          type="button"
          onClick={() => setReceiptOptin((v) => !v)}
          className="mt-3 flex w-full items-center gap-3 text-left"
        >
          <span
            className={`grid h-[26px] w-[26px] flex-none place-items-center rounded-lg border-2 text-[15px] font-black text-white ${
              receiptOptin ? "border-forest bg-forest" : "border-[#CDD2C7] bg-white"
            }`}
          >
            {receiptOptin ? "✓" : ""}
          </span>
          <span>
            <b className="block text-sm font-black text-ink">기부영수증 신청</b>
            <small className="text-[11.5px] text-muted">
              주민번호는 저장하지 않습니다(발급 시 휴대전화번호 방식)
            </small>
          </span>
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm font-bold text-[#B4472F]">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-forest p-4 text-base font-black text-white shadow-lg disabled:opacity-60"
      >
        {pending ? "저장 중…" : member ? "저장" : "가입 완료 · 저장"}
      </button>
      {member ? (
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 block w-full rounded-2xl p-3 text-center text-sm font-bold text-muted"
        >
          취소
        </button>
      ) : null}
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="w-[82px] flex-none text-[13px] font-extrabold text-ink">{label}</span>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-line py-3 first:border-t-0">
      <span className="text-[13px] font-bold text-muted">{label}</span>
      <span className="text-sm font-black text-ink">{value}</span>
    </div>
  );
}
