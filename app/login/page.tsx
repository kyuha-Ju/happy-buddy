"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginByPhone } from "@/app/me/actions";

function formatPhone(raw: string) {
  const d = (raw || "").replace(/[^0-9]/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const m = await loginByPhone(phone);
      if (!m) {
        setError("가입되지 않은 번호예요. 먼저 회원가입을 해주세요.");
        return;
      }
      try {
        if (m.device_token) localStorage.setItem("hb_device_token", m.device_token);
      } catch {}
      router.push("/mypage");
    });
  }

  return (
    <main className="pt-5">
      <div className="text-[22px] font-black tracking-tight text-forest">HAPPY BUDDY</div>

      <form onSubmit={onSubmit} className="mt-10">
        <label className="mb-2 block px-1 text-[13px] font-extrabold text-ink">
          전화번호로 로그인
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          inputMode="numeric"
          placeholder="010-0000-0000"
          className="w-full rounded-2xl border-[1.5px] border-line bg-surface px-4 py-4 text-center text-lg font-bold tracking-wide text-ink outline-none focus:border-forest"
        />

        {error ? (
          <div className="mt-4 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm font-bold text-[#B4472F]">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-2xl bg-forest p-4 text-base font-black tracking-wide text-white shadow-lg disabled:opacity-60"
        >
          {pending ? "확인 중…" : "LOGIN"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-muted">
        아직 회원이 아니신가요?{" "}
        <Link href="/me" className="font-extrabold text-forest underline">
          회원가입
        </Link>
      </p>
      <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">
        홈으로
      </Link>
    </main>
  );
}
