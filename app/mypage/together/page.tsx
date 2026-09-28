"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import { getMemberByToken } from "@/app/me/actions";
import { getTogether, type TogetherRow } from "@/app/stats/actions";

const TOKEN_KEY = "hb_device_token";

export default function TogetherPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TogetherRow[] | null>(null);

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
      getTogether(m.id).then(setRows);
    });
  }, [router]);

  return (
    <main>
      <ScreenHeader title="함께 기부한 사람들" subtitle="같이 만든 나눔" back="/mypage" />

      {rows === null ? (
        <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="text-3xl">🤝</div>
          <div className="mt-2 text-[14px] font-black text-ink">아직 함께한 기록이 없어요</div>
          <div className="mt-1 text-[12.5px] text-muted">같은 위시리스트를 함께 채우면 여기에 나타납니다.</div>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {rows.map((r) => (
            <div key={r.memberId} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="grid h-10 w-10 flex-none place-items-center rounded-full bg-forest-2 text-[13px] font-black text-white">
                {r.name.slice(0, 2)}
              </div>
              <div className="flex-1 text-[15px] font-black text-ink">{r.name}</div>
              <div className="rounded-full bg-[#EEF3EC] px-3 py-1 text-[12px] font-black text-forest">
                함께 {r.sharedCount}번
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
