"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import {
  listCharities,
  listPendingCharities,
  approveCharity,
  rejectCharity,
  type CharityLite,
} from "@/app/charities/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const pct = (r: number, t: number) => (t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0);

export default function CharitiesPage() {
  const [approved, setApproved] = useState<CharityLite[]>([]);
  const [pending, setPending] = useState<CharityLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const [a, p] = await Promise.all([listCharities(), listPendingCharities()]);
    setApproved(a);
    setPending(p);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function doApprove(id: string) {
    setBusy(id);
    await approveCharity(id);
    await load();
    setBusy(null);
  }
  async function doReject(id: string) {
    setBusy(id);
    await rejectCharity(id);
    await load();
    setBusy(null);
  }

  return (
    <main>
      <ScreenHeader title="기부처" subtitle="위시리스트를 함께 채워요" back="/" />

      <Link
        href="/charities/new"
        className="mt-4 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg"
      >
        ＋ 기부처 등록하기
      </Link>

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>
      ) : (
        <>
          {/* 승인 대기(운영자) */}
          {pending.length > 0 && (
            <section className="mt-6">
              <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">
                운영자 승인 대기 · {pending.length}
              </div>
              {pending.map((c) => (
                <div key={c.id} className="mb-2 rounded-2xl border border-[#E4D9B8] bg-[#FBF7EA] p-4">
                  <div className="flex items-center gap-2">
                    <b className="text-[15px] font-black text-ink">{c.name}</b>
                    {c.tax_deductible && (
                      <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">
                        세액공제
                      </span>
                    )}
                  </div>
                  {c.description && <div className="mt-1 text-[12.5px] text-muted">{c.description}</div>}
                  <div className="mt-1 text-[11.5px] font-bold text-muted">위시리스트 {c.item_count}개 · 목표 {won(c.target_total)}</div>
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={busy === c.id}
                      onClick={() => doApprove(c.id)}
                      className="flex-1 rounded-xl bg-forest py-2.5 text-[13px] font-black text-white disabled:opacity-50"
                    >
                      승인
                    </button>
                    <button
                      disabled={busy === c.id}
                      onClick={() => doReject(c.id)}
                      className="flex-1 rounded-xl bg-[#F0ECE1] py-2.5 text-[13px] font-black text-[#96603a] disabled:opacity-50"
                    >
                      반려
                    </button>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* 승인된 기부처 */}
          <section className="mt-6">
            <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">기부처 · {approved.length}</div>
            {approved.length === 0 ? (
              <div className="rounded-xl bg-surface/60 py-8 text-center text-[12.5px] text-muted">
                아직 승인된 기부처가 없습니다.
              </div>
            ) : (
              approved.map((c) => (
                <Link
                  key={c.id}
                  href={`/charities/${c.id}`}
                  className="mb-2 block rounded-2xl border border-line bg-surface p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <b className="text-[15px] font-black text-ink">{c.name}</b>
                    {c.tax_deductible && (
                      <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">
                        세액공제
                      </span>
                    )}
                    <span className="ml-auto text-forest">›</span>
                  </div>
                  {c.description && <div className="mt-1 text-[12.5px] text-muted line-clamp-2">{c.description}</div>}
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{ width: `${pct(c.raised_total, c.target_total)}%` }}
                    />
                  </div>
                  <div className="mt-1.5 flex justify-between text-[11.5px] font-bold">
                    <span className="text-forest">{won(c.raised_total)} 모임</span>
                    <span className="text-muted">목표 {won(c.target_total)} · {pct(c.raised_total, c.target_total)}%</span>
                  </div>
                </Link>
              ))
            )}
          </section>
        </>
      )}

      <Link href="/" className="mt-6 block text-center text-sm font-bold text-muted">홈으로</Link>
    </main>
  );
}
