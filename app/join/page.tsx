"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getRoundTokenByCode } from "@/app/rounds/actions";

export default function JoinByCodePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const c = code.replace(/[^0-9]/g, "");
    if (c.length !== 4) {
      setError("4자리 입장 코드를 입력해 주세요.");
      return;
    }
    startTransition(async () => {
      const token = await getRoundTokenByCode(c);
      if (!token) {
        setError("해당 코드의 라운드를 찾을 수 없어요.");
        return;
      }
      router.push(`/join/${token}`);
    });
  }

  return (
    <main>
      <ScreenHeader title="라운드 입장" subtitle="입장 코드로 참여" back="/" />
      <form onSubmit={onSubmit} className="mt-8">
        <label className="mb-2 block px-1 text-[13px] font-extrabold text-ink">4자리 입장 코드</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="0000"
          className="w-full rounded-2xl border-[1.5px] border-line bg-surface px-4 py-4 text-center text-3xl font-black tracking-[0.3em] tabular-nums outline-none focus:border-forest"
        />
        {error ? <div className="mt-4 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm font-bold text-[#B4472F]">{error}</div> : null}
        <button type="submit" disabled={pending} className="mt-5 w-full rounded-2xl bg-forest p-4 text-base font-black text-white shadow-lg disabled:opacity-60">
          {pending ? "확인 중…" : "입장"}
        </button>
      </form>
      <Link href="/" className="mt-3 block text-center text-sm font-bold text-muted">홈으로</Link>
    </main>
  );
}
