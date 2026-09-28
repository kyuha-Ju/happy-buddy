"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getRoundPlay, markSettled, type PlayData } from "@/app/rounds/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function SettlePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<PlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    getRoundPlay(params.id).then((d) => {
      setData(d);
      if (d && d.status === "settled") setSettled(true);
      setLoading(false);
    });
  }, [params.id]);

  const sum = useMemo(() => {
    const s = { all: 0, joy: 0, rec: 0, rows: [] as { id: string; name: string; total: number }[] };
    if (!data) return s;
    const byP: Record<string, number> = {};
    for (const l of data.logs) {
      s.all += l.amount;
      if (l.kind === "joy") s.joy += l.amount;
      else s.rec += l.amount;
      byP[l.player_id] = (byP[l.player_id] || 0) + l.amount;
    }
    s.rows = data.players
      .map((p) => ({ id: p.id, name: p.display_name, total: byP[p.id] || 0 }))
      .sort((a, b) => b.total - a.total);
    return s;
  }, [data]);

  async function confirm() {
    if (!data) return;
    setSettled(true);
    await markSettled(data.id);
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!data) return <div className="mt-10 text-center text-sm text-muted">라운드를 찾을 수 없어요.</div>;

  return (
    <main>
      <ScreenHeader title="라운드 정산" subtitle={`${data.name}${data.course ? " · " + data.course : ""}`} back={`/rounds/${data.id}/play`} />

      <div className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-5 text-center">
        <div className="text-xs font-bold text-[#4B7A5C]">이번 라운드 총 기부금</div>
        <div className="mt-1 text-[30px] font-black tabular-nums text-joy">{won(sum.all)}</div>
        <div className="mt-2 flex justify-center gap-4 text-[12.5px] font-bold">
          <span className="text-joy">😊 기쁨 {won(sum.joy)}</span>
          <span className="text-recover">💪 회복 {won(sum.rec)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">선수별 적립</div>
        {sum.rows.map((r) => (
          <div key={r.id} className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-forest-2 text-xs font-black text-white">{r.name.slice(0, 2)}</div>
            <div className="flex-1 text-sm font-extrabold">{r.name}</div>
            <div className="text-[15px] font-black tabular-nums text-forest">{won(r.total)}</div>
          </div>
        ))}
      </div>

      {settled ? (
        <div className="mt-4 rounded-xl bg-[#E7F0E9] px-4 py-3 text-center text-sm font-bold text-joy">✓ 정산이 확정되었습니다</div>
      ) : (
        <button onClick={confirm} className="mt-5 w-full rounded-2xl bg-[#E4E9E1] p-4 text-[15px] font-extrabold text-forest">정산 확정</button>
      )}

      <Link href={`/rounds/${data.id}/donate`} className="mt-3 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg">기부하기 · 위시리스트 채우기 →</Link>
      <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">홈으로</Link>
    </main>
  );
}
