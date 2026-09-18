"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getMemberByToken, type Member } from "@/app/me/actions";

const TOKEN_KEY = "hb_device_token";

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex-1 rounded-2xl border-2 border-forest/15 bg-surface px-4 py-3.5 text-center">
      <div className="text-[11px] font-bold text-muted">{k}</div>
      <div className="mt-1 text-lg font-black tabular-nums text-forest">{v}</div>
    </div>
  );
}

export default function MyPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!token) {
      router.replace("/login");
      return;
    }
    getMemberByToken(token).then((m) => {
      if (!m) {
        router.replace("/login");
        return;
      }
      setMember(m);
      setLoading(false);
    });
  }, [router]);

  function logout() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    router.push("/");
  }

  if (loading || !member) {
    return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  }

  return (
    <main className="pt-5">
      <div className="text-[20px] font-black text-ink">
        {member.name} 회원님 안녕하세요
      </div>

      <div className="mt-5 flex gap-2.5">
        <Tile k="누적 기부액" v="0원" />
        <Tile k="기부 횟수" v="0회" />
      </div>

      <Link
        href="/rounds/new"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] bg-forest p-5 text-lg font-black tracking-wide text-white shadow-lg"
      >
        🏌️ ROUND START
      </Link>

      <Link
        href="/mypage/history"
        className="mt-3 flex w-full items-center justify-between rounded-2xl bg-forest px-5 py-4 text-base font-black text-white"
      >
        나의 기부 내역 <span>›</span>
      </Link>
      <Link
        href="/mypage/together"
        className="mt-3 flex w-full items-center justify-between rounded-2xl bg-forest px-5 py-4 text-base font-black text-white"
      >
        함께 기부한 사람들 <span>›</span>
      </Link>

      <div className="mt-8 flex justify-center gap-6 text-sm font-bold text-muted">
        <Link href="/me">내 정보 수정</Link>
        <button onClick={logout}>로그아웃</button>
      </div>
    </main>
  );
}
