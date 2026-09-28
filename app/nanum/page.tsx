"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getNanumData, type NanumData } from "@/app/stats/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtDate = (s: string | null) => {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

export default function NanumPage() {
  const [data, setData] = useState<NanumData | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    getNanumData().then(setData);
  }, []);

  if (!data) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;

  const empty = data.completed.length === 0 && data.fundings.length === 0;

  return (
    <main>
      <ScreenHeader title="나눔 완료" subtitle="완주한 위시리스트" back="/" />

      {empty ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="text-3xl">🏆</div>
          <div className="mt-2 text-[14px] font-black text-ink">아직 완주한 위시리스트가 없어요</div>
          <div className="mt-1 text-[12.5px] text-muted">모임이 함께 채우면 여기에서 나눔 소식을 볼 수 있습니다.</div>
          <Link href="/charities" className="mt-4 block w-full rounded-2xl bg-forest p-3.5 text-[14px] font-black text-white">기부처 보러가기</Link>
        </div>
      ) : (
        <>
          {/* 완주 카드 */}
          {data.completed.length > 0 && (
            <section className="mt-4">
              <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">완주한 위시리스트 · {data.completed.length}</div>
              {data.completed.map((c) => (
                <div key={c.id} className="mb-2.5 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-white shadow-lg">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-black">🎉 100% 완주</span>
                    {c.completedAt && <span className="ml-auto text-[11px] opacity-80">{fmtDate(c.completedAt)}</span>}
                  </div>
                  <div className="mt-3 text-[11px] opacity-85">{c.charityName}</div>
                  <div className="text-lg font-black">{c.itemName}</div>
                  <div className="mt-2 flex justify-between text-[12px] font-bold">
                    <span className="opacity-90">달성 {won(c.targetCost)}</span>
                    <span className="opacity-90">참여 {c.groupsCount}팀</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 기부 내역 (모임·멤버별) */}
          {data.fundings.length > 0 && (
            <section className="mt-5">
              <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">기부 내역</div>
              {data.fundings.map((f) => {
                const isOpen = open === f.id;
                return (
                  <div key={f.id} className="mb-2 rounded-2xl border border-line bg-surface shadow-sm">
                    <button
                      onClick={() => setOpen(isOpen ? null : f.id)}
                      className="flex w-full items-center gap-3 p-4 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <b className="block text-[14px] font-black text-ink">{f.charityName}</b>
                        <small className="text-[12px] text-muted">
                          {f.itemName}
                          {f.roundName ? ` · ${f.roundName}` : ""}
                        </small>
                      </div>
                      <div className="text-right">
                        <div className="text-[15px] font-black tabular-nums text-forest">{won(f.amount)}</div>
                        <div className="text-[11px] font-bold text-muted">{f.members.length}명 · {isOpen ? "닫기" : "명단"}</div>
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-line px-4 py-3">
                        {f.members.length === 0 ? (
                          <div className="text-[12px] text-muted">개인별 명단이 없습니다.</div>
                        ) : (
                          f.members.map((m, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5 text-[13px]">
                              <span className="font-bold text-ink">{m.name}</span>
                              <span className="font-black tabular-nums text-forest-2">{won(m.amount)}</span>
                            </div>
                          ))
                        )}
                        {f.date && <div className="mt-1 text-[11px] font-bold text-muted">{fmtDate(f.date)}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}

      <Link href="/" className="mt-6 block text-center text-sm font-bold text-muted">홈으로</Link>
    </main>
  );
}
