"use client";

import { useEffect, useState } from "react";
import { getHomeStats, type HomeStats as Stats } from "@/app/stats/actions";

const money = (n: number) => {
  if (n >= 100000000) return (n / 100000000).toFixed(n % 100000000 === 0 ? 0 : 1) + "억원";
  if (n >= 10000) return Math.round(n / 10000).toLocaleString("ko-KR") + "만원";
  return n.toLocaleString("ko-KR") + "원";
};

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex-1 rounded-2xl border-2 border-forest/15 bg-surface px-4 py-3.5 text-center">
      <div className="text-[11px] font-bold text-muted">{k}</div>
      <div className="mt-1 text-lg font-black tabular-nums text-forest">{v}</div>
    </div>
  );
}

export default function HomeStats() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    getHomeStats().then(setS);
  }, []);
  return (
    <div className="mt-5 flex gap-2.5">
      <Tile k="누적 기부" v={s ? money(s.totalDonated) : "…"} />
      <Tile k="참여 인원" v={s ? `${s.participantCount}명` : "…"} />
    </div>
  );
}
