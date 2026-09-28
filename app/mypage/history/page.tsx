"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import { getMemberByToken } from "@/app/me/actions";
import { getMyHistory, type MyHistoryRow } from "@/app/stats/actions";

const TOKEN_KEY = "hb_device_token";
const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtDate = (s: string) => {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function HistoryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<MyHistoryRow[] | null>(null);

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
      getMyHistory(m.id).then(setRows);
    });
  }, [router]);

  const total = (rows || []).reduce((s, r) => s + r.amount, 0);

  return (
    <main>
      <ScreenHeader title="나의 기부 내역" subtitle="내가 채운 기부" back="/mypage" />

      {rows === null ? (
        <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="text-3xl">🌱</div>
          <div className="mt-2 text-[14px] font-black text-ink">아직 기부 내역이 없어요</div>
          <div className="mt-1 text-[12.5px] text-muted">라운드에 참여하고 정산 후 기부하면 여기에 쌓입니다.</div>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-4 text-center">
            <div className="text-xs font-bold text-[#4B7A5C]">누적 기부액</div>
            <div className="mt-1 text-[26px] font-black tabular-nums text-joy">{won(total)}</div>
            <div className="mt-0.5 text-[12px] font-bold text-muted">총 {rows.length}회</div>
          </div>

          <div className="mt-4 space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <b className="text-[14px] font-black text-ink">{r.charityName}</b>
                  <span className="text-[15px] font-black tabular-nums text-forest">{won(r.amount)}</span>
                </div>
                <div className="mt-1 text-[12.5px] text-muted">
                  {r.itemName}
                  {r.roundName ? ` · ${r.roundName}` : ""}
                </div>
                {r.date && <div className="mt-0.5 text-[11px] font-bold text-muted">{fmtDate(r.date)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
