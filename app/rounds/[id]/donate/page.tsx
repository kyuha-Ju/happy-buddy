"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import {
  getRoundDonateInfo,
  listOpenWishlists,
  fundWishlist,
  type RoundDonateInfo,
  type OpenCharity,
  type WishItem,
} from "@/app/charities/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const pct = (r: number, t: number) => (t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0);
const onlyNum = (s: string) => parseInt(s.replace(/[^0-9]/g, ""), 10) || 0;
const comma = (s: string) => {
  const d = s.replace(/[^0-9]/g, "");
  return d ? parseInt(d, 10).toLocaleString("ko-KR") : "";
};

type Result = {
  itemName: string;
  charityName: string;
  charityId: string;
  amount: number;
  raised: number;
  target: number;
  completed: boolean;
};

export default function DonatePage() {
  const params = useParams<{ id: string }>();
  const [info, setInfo] = useState<RoundDonateInfo | null>(null);
  const [charities, setCharities] = useState<OpenCharity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null); // wishlist item id
  const [amt, setAmt] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [results, setResults] = useState<Result[]>([]);

  async function reload() {
    const [i, c] = await Promise.all([getRoundDonateInfo(params.id), listOpenWishlists()]);
    setInfo(i);
    setCharities(c);
    setLoading(false);
    return i;
  }
  useEffect(() => {
    reload();
  }, [params.id]);

  function openItem(it: WishItem, remaining: number) {
    setErr("");
    const need = Math.max(0, it.target_cost - it.raised_amount);
    const dflt = Math.min(remaining, need > 0 ? need : remaining);
    setExpanded(it.id);
    setAmt(dflt.toLocaleString("ko-KR"));
  }

  async function confirmFund(it: WishItem, c: OpenCharity) {
    if (!info) return;
    const value = onlyNum(amt);
    if (value <= 0) return setErr("금액을 입력하세요.");
    if (value > info.remaining) return setErr(`남은 배분액(${won(info.remaining)})을 넘을 수 없어요.`);
    setBusy(true);
    setErr("");
    const res = await fundWishlist({ roundId: info.roundId, wishlistItemId: it.id, amount: value });
    if (!res.ok) {
      setBusy(false);
      return setErr(res.error);
    }
    setResults((r) => [
      ...r,
      {
        itemName: it.name,
        charityName: c.name,
        charityId: c.id,
        amount: res.contributed,
        raised: res.raised,
        target: res.target,
        completed: res.itemStatus === "completed",
      },
    ]);
    setExpanded(null);
    setAmt("");
    await reload();
    setBusy(false);
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!info) return <div className="mt-10 text-center text-sm text-muted">라운드를 찾을 수 없어요.</div>;

  // ===== 배분 완료 화면 =====
  if (info.remaining <= 0) {
    const placeCount = results.length > 0 ? results.length : info.allocations.length;
    return (
      <main>
        <ScreenHeader title="기부 완료" subtitle={info.roundName} back="/" />
        <div className="mt-6 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-5 text-center">
          <div className="text-4xl">🎉</div>
          <div className="mt-1.5 text-base font-black text-joy">기부가 모두 전달되었습니다</div>
          <div className="mt-0.5 text-[14px] font-black text-ink">총 {won(info.total)}</div>
          <div className="mt-0.5 text-[12px] font-bold text-muted">{placeCount}곳에 나눠 기부</div>
        </div>

        <section className="mt-5">
          <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">배분 내역</div>
          {(results.length > 0 ? results : info.allocations).map((r: any, i: number) => (
            <div key={i} className="mb-2 rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <b className="block text-[14px] font-black text-ink">{r.charityName}</b>
                  <small className="text-[12px] text-muted">{r.itemName}</small>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-black tabular-nums text-forest">{won(r.amount)}</div>
                  {"completed" in r && r.completed && <div className="text-[11px] font-black text-joy">✓ 완주</div>}
                </div>
              </div>
              {"target" in r && r.target ? (
                <>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                    <div className={`h-full rounded-full ${r.completed ? "bg-joy" : "bg-forest"}`} style={{ width: `${pct(r.raised, r.target)}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11.5px] font-bold text-muted">{won(r.raised)} / {won(r.target)}</div>
                </>
              ) : null}
            </div>
          ))}
        </section>

        <Link href="/nanum" className="mt-5 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg">나눔 완료 보기 →</Link>
        <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">홈으로</Link>
      </main>
    );
  }

  // ===== 배분 진행 화면 =====
  return (
    <main>
      <ScreenHeader title="기부하기" subtitle="위시리스트 채우기" back={`/rounds/${info.roundId}/settle`} />

      {/* 잔액 카드 */}
      <div className="mt-4 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-center text-white shadow-lg">
        <div className="text-xs font-bold opacity-85">남은 배분액</div>
        <div className="mt-1 text-[34px] font-black tabular-nums leading-none">{won(info.remaining)}</div>
        <div className="mt-2 text-[11.5px] opacity-80">
          이번 라운드 기부금 {won(info.total)}
          {info.allocated > 0 ? ` · 배분 완료 ${won(info.allocated)}` : ""}
        </div>
      </div>

      {/* 이미 배분한 내역 */}
      {info.allocations.length > 0 && (
        <div className="mt-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <div className="text-[12px] font-black text-forest">이미 배분한 내역</div>
          {info.allocations.map((a) => (
            <div key={a.fundingId} className="flex items-center justify-between border-t border-line py-2 first:border-t-0">
              <span className="text-[12.5px] font-bold">{a.charityName} · <span className="text-muted">{a.itemName}</span></span>
              <span className="text-[13px] font-black tabular-nums text-forest">{won(a.amount)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 mx-1 text-[12px] font-bold text-muted">
        채울 위시리스트를 고르세요. 필요한 만큼만 자동으로 채워지고, 남은 금액은 다른 곳에 이어서 기부할 수 있어요.
      </div>

      {/* 위시리스트 선택 */}
      {charities.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-[14px] font-black text-ink">채울 수 있는 위시리스트가 없습니다</div>
          <div className="mt-1 text-[12.5px] text-muted">승인된 기부처의 위시리스트가 필요합니다.</div>
          <Link href="/charities/new" className="mt-4 block w-full rounded-2xl bg-forest p-3.5 text-[14px] font-black text-white">기부처 등록하기</Link>
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {charities.map((c) => (
            <section key={c.id}>
              <div className="mx-1 mb-2 flex items-center gap-2 text-xs font-black tracking-wide text-muted">
                {c.name}
                {c.tax_deductible && <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">세액공제</span>}
              </div>
              {c.items.map((it) => {
                const need = Math.max(0, it.target_cost - it.raised_amount);
                const isOpen = expanded === it.id;
                return (
                  <div key={it.id} className={`mb-2 rounded-2xl border-[1.5px] bg-surface shadow-sm ${isOpen ? "border-forest ring-2 ring-forest/15" : "border-line"}`}>
                    <button onClick={() => (isOpen ? setExpanded(null) : openItem(it, info.remaining))} className="w-full p-4 text-left">
                      <div className="flex items-center gap-2">
                        <b className="flex-1 text-[14px] font-black">{it.name}</b>
                        <span className="text-[11.5px] font-bold text-muted">{pct(it.raised_amount, it.target_cost)}%</span>
                      </div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                        <div className="h-full rounded-full bg-forest" style={{ width: `${pct(it.raised_amount, it.target_cost)}%` }} />
                      </div>
                      <div className="mt-1.5 flex justify-between text-[11.5px] font-bold">
                        <span className="text-muted">{won(it.raised_amount)} / {won(it.target_cost)}</span>
                        <span className="text-forest-2">필요 {won(need)}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-line px-4 py-3">
                        <div className="text-[12px] font-bold text-muted">넣을 금액 (남은 배분액 {won(info.remaining)})</div>
                        <input
                          value={amt}
                          onChange={(e) => setAmt(comma(e.target.value))}
                          inputMode="numeric"
                          className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-right text-[16px] font-black tabular-nums outline-none focus:border-forest"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => setAmt(Math.min(info.remaining, need > 0 ? need : info.remaining).toLocaleString("ko-KR"))}
                            className="flex-1 rounded-xl bg-[#EEF3EC] py-2 text-[12px] font-black text-forest"
                          >
                            필요한 만큼 ({won(Math.min(info.remaining, need > 0 ? need : info.remaining))})
                          </button>
                          <button
                            onClick={() => setAmt(info.remaining.toLocaleString("ko-KR"))}
                            className="flex-1 rounded-xl bg-[#EEF3EC] py-2 text-[12px] font-black text-forest"
                          >
                            잔액 전부 ({won(info.remaining)})
                          </button>
                        </div>
                        <button
                          onClick={() => confirmFund(it, c)}
                          disabled={busy}
                          className="mt-3 w-full rounded-2xl bg-forest p-3.5 text-center text-[15px] font-black text-white disabled:opacity-50"
                        >
                          {busy ? "처리 중…" : "이 위시리스트에 기부"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {err && <div className="mt-3 rounded-xl bg-[#FBEAE5] px-4 py-3 text-center text-[13px] font-bold text-[#B4472F]">{err}</div>}

      <Link href="/" className="mt-5 block text-center text-sm font-bold text-muted">나중에 하기 · 홈으로</Link>
    </main>
  );
}
