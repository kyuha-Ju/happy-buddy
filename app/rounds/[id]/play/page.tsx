"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import {
  getRoundPlay,
  addDonation,
  deleteDonation,
  type PlayData,
  type PlayLog,
} from "@/app/rounds/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

export default function PlayPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<PlayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [armed, setArmed] = useState<string | null>(null); // event id
  const [hole, setHole] = useState(1); // 현재 홀
  const [flash, setFlash] = useState<string | null>(null); // player id
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getRoundPlay(params.id).then((d) => {
      setData(d);
      if (d && d.events[0]) setArmed(d.events[0].id);
      setLoading(false);
    });
  }, [params.id]);

  const totals = useMemo(() => {
    const t = { all: 0, joy: 0, rec: 0, byPlayer: {} as Record<string, number> };
    if (!data) return t;
    for (const l of data.logs) {
      t.all += l.amount;
      if (l.kind === "joy") t.joy += l.amount;
      else t.rec += l.amount;
      t.byPlayer[l.player_id] = (t.byPlayer[l.player_id] || 0) + l.amount;
    }
    return t;
  }, [data]);

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 1500);
  }

  async function tapPlayer(playerId: string) {
    if (!data) return;
    if (!armed) {
      showToast("먼저 위에서 이벤트를 선택하세요");
      return;
    }
    const ev = data.events.find((e) => e.id === armed);
    if (!ev || busy) return;
    setBusy(true);
    const res = await addDonation({
      roundId: data.id,
      playerId,
      eventId: ev.id,
      amount: ev.amount,
      kind: ev.kind,
      hole,
    });
    setBusy(false);
    if (!res.ok) {
      showToast(res.error);
      return;
    }
    const newLog: PlayLog = {
      id: res.id,
      player_id: playerId,
      event_id: ev.id,
      amount: ev.amount,
      kind: ev.kind,
      hole,
      created_at: new Date().toISOString(),
    };
    setData({ ...data, logs: [...data.logs, newLog] });
    setFlash(playerId);
    setTimeout(() => setFlash(null), 500);
  }

  async function undo(logId: string) {
    if (!data) return;
    setData({ ...data, logs: data.logs.filter((l) => l.id !== logId) });
    await deleteDonation(logId);
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!data) return <div className="mt-10 text-center text-sm text-muted">라운드를 찾을 수 없어요.</div>;

  const nameOf = (pid: string) => data.players.find((p) => p.id === pid)?.display_name ?? "";
  const eventOf = (eid: string) => data.events.find((e) => e.id === eid);
  const recent = [...data.logs].slice(-8).reverse();

  return (
    <main className="relative">
      <ScreenHeader title="경기 진행 중" subtitle={`${data.name}${data.course ? " · " + data.course : ""}`} back="/" />

      {/* 총액 */}
      <div className="mt-4 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-center text-white shadow-lg">
        <div className="text-xs font-bold tracking-wide opacity-85">총 적립 기부금</div>
        <div className="mt-1 text-[38px] font-black tabular-nums leading-none">{won(totals.all)}</div>
        <div className="mt-3 flex justify-center gap-2">
          <div className="flex-1 rounded-xl bg-white/10 px-2 py-2">
            <div className="text-[10.5px] opacity-85">😊 기쁨기부</div>
            <div className="mt-0.5 text-[15px] font-black tabular-nums">{won(totals.joy)}</div>
          </div>
          <div className="flex-1 rounded-xl bg-white/10 px-2 py-2">
            <div className="text-[10.5px] opacity-85">💪 회복기부</div>
            <div className="mt-0.5 text-[15px] font-black tabular-nums">{won(totals.rec)}</div>
          </div>
        </div>
      </div>

      {/* 홀 선택 */}
      <div className="mt-4">
        <div className="mx-1 mb-1.5 text-[11.5px] font-bold text-muted">
          홀 선택 <b className="text-forest">· 현재 {hole}홀</b>
        </div>
        <div className="grid grid-cols-9 gap-1">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((h) => (
            <HoleBtn key={h} h={h} active={hole === h} onClick={() => setHole(h)} />
          ))}
        </div>
        <div className="mt-1 grid grid-cols-9 gap-1">
          {Array.from({ length: 9 }, (_, i) => i + 10).map((h) => (
            <HoleBtn key={h} h={h} active={hole === h} onClick={() => setHole(h)} />
          ))}
        </div>
      </div>

      {/* 이벤트(먼저 선택) */}
      <div className="mt-4 text-[11.5px] leading-relaxed text-muted">
        <b className="text-forest-2">방식 B:</b> 홀을 고르고, 이벤트를 하나 켠 뒤, 그 이벤트를 한 선수를 눌러 적립하세요.
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {data.events.map((e) => (
          <button
            key={e.id}
            onClick={() => setArmed(armed === e.id ? null : e.id)}
            className={`min-w-[92px] flex-1 rounded-2xl border-[1.5px] bg-surface px-2 py-3 text-center ${armed === e.id ? "border-forest bg-[#EEF3EC] ring-2 ring-forest/15" : "border-line"}`}
          >
            <b className="block text-sm font-black">{e.name}</b>
            <small className={`text-[11px] font-bold ${e.kind === "joy" ? "text-joy" : "text-recover"}`}>+{won(e.amount)}</small>
          </button>
        ))}
      </div>

      {/* 선수 그리드 */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {data.players.map((p) => (
          <button
            key={p.id}
            onClick={() => tapPlayer(p.id)}
            className={`relative rounded-2xl border-[1.5px] border-line bg-surface p-3.5 text-left transition active:scale-95 ${flash === p.id ? "ring-2 ring-joy" : ""}`}
          >
            <div className="text-[15px] font-black">{p.display_name}</div>
            <div className="mt-1.5 text-[19px] font-black tabular-nums text-forest">{won(totals.byPlayer[p.id] || 0)}</div>
            <div className="mt-0.5 text-[10.5px] text-muted">{armed ? "탭하면 적립" : "이벤트 먼저 선택"}</div>
            {flash === p.id ? <span className="absolute right-3 top-3 text-xs font-black text-joy">+{won(eventOf(armed || "")?.amount || 0)}</span> : null}
          </button>
        ))}
      </div>

      {/* 실시간 내역 */}
      <div className="mt-5">
        <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">실시간 내역</div>
        {recent.length === 0 ? (
          <div className="rounded-xl bg-surface/60 py-6 text-center text-[12.5px] text-muted">아직 적립 내역이 없습니다.<br />이벤트를 켜고 선수를 눌러보세요.</div>
        ) : (
          recent.map((l) => {
            const e = eventOf(l.event_id);
            const joy = l.kind === "joy";
            return (
              <div key={l.id} className="mb-1.5 flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3 py-2.5">
                <span className={`h-2.5 w-2.5 flex-none rounded-full ${joy ? "bg-joy" : "bg-recover"}`} />
                <span className="flex-1 text-[13px] font-bold">{l.hole ? <span className="text-muted">{l.hole}홀 · </span> : null}{nameOf(l.player_id)} · {e?.name} <small className="font-medium text-muted">{joy ? "기쁨기부" : "회복기부"}</small></span>
                <span className={`text-sm font-black tabular-nums ${joy ? "text-joy" : "text-recover"}`}>+{won(l.amount)}</span>
                <button onClick={() => undo(l.id)} className="rounded-lg bg-[#F0ECE1] px-2 py-1 text-[11px] font-bold text-[#96603a]">취소</button>
              </div>
            );
          })
        )}
      </div>

      <Link href={`/rounds/${data.id}/settle`} className="mt-5 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg">라운드 종료 · 정산하기</Link>

      {toast ? <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lg">{toast}</div> : null}
    </main>
  );
}

function HoleBtn({ h, active, onClick }: { h: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg py-2 text-[13px] font-black tabular-nums transition ${active ? "bg-forest text-white" : "border border-line bg-surface text-ink"}`}
    >
      {h}
    </button>
  );
}
