"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getCharity, type CharityView } from "@/app/charities/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const pct = (r: number, t: number) => (t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0);

export default function CharityDetailPage() {
  const params = useParams<{ id: string }>();
  const [c, setC] = useState<CharityView | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCharity(params.id).then((d) => {
      setC(d);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!c) return <div className="mt-10 text-center text-sm text-muted">기부처를 찾을 수 없어요.</div>;

  const open = c.items.filter((i) => i.status !== "completed");
  const featured = open[0] || c.items[0];
  const rest = c.items.filter((i) => i.id !== featured?.id);

  return (
    <main>
      <ScreenHeader title="기부처" subtitle={c.name} back="/charities" />

      <div className="mt-4 flex items-center gap-2">
        <b className="text-[18px] font-black text-ink">{c.name}</b>
        {c.tax_deductible && (
          <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">세액공제</span>
        )}
      </div>
      {c.description && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{c.description}</p>}

      {/* 대표 위시리스트 */}
      {featured && (
        <div className="mt-4 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-white shadow-lg">
          <div className="text-xs font-bold opacity-85">대표 위시리스트</div>
          <div className="mt-1 text-lg font-black">{featured.name}</div>
          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${pct(featured.raised_amount, featured.target_cost)}%` }}
            />
          </div>
          <div className="mt-2 flex items-end justify-between">
            <div>
              <div className="text-[26px] font-black tabular-nums leading-none">
                {pct(featured.raised_amount, featured.target_cost)}%
              </div>
              <div className="mt-1 text-[11.5px] opacity-85">
                {won(featured.raised_amount)} / {won(featured.target_cost)}
              </div>
            </div>
            <div className="text-right text-[11px] opacity-85">
              참여 {featured.groups_count}팀
              {featured.status === "completed" && <div className="mt-0.5 font-black text-[#BFF0C9]">✓ 완주</div>}
            </div>
          </div>
        </div>
      )}

      {/* 나머지 위시리스트 */}
      {rest.length > 0 && (
        <section className="mt-5">
          <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">다른 위시리스트</div>
          {rest.map((it) => (
            <div key={it.id} className="mb-2 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <b className="text-[14px] font-black">{it.name}</b>
                {it.status === "completed" ? (
                  <span className="text-[11px] font-black text-joy">✓ 완주</span>
                ) : (
                  <span className="text-[11px] font-bold text-muted">{pct(it.raised_amount, it.target_cost)}%</span>
                )}
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                <div
                  className={`h-full rounded-full ${it.status === "completed" ? "bg-joy" : "bg-forest"}`}
                  style={{ width: `${pct(it.raised_amount, it.target_cost)}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11.5px] font-bold text-muted">
                {won(it.raised_amount)} / {won(it.target_cost)}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="mt-6 rounded-2xl bg-[#F3EFE3] p-4 text-center text-[12.5px] leading-relaxed text-muted">
        기부는 <b className="text-forest">라운드 정산</b> 후<br />“기부하기 · 위시리스트 채우기”에서 진행됩니다.
      </div>

      <Link href="/charities" className="mt-4 block text-center text-sm font-bold text-muted">기부처 목록으로</Link>
    </main>
  );
}
