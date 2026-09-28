"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import {
  getRoundDonateInfo,
  listOpenWishlists,
  fundWishlist,
  getCharity,
  type RoundDonateInfo,
  type OpenCharity,
  type CharityView,
} from "@/app/charities/actions";

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const pct = (r: number, t: number) => (t > 0 ? Math.min(100, Math.round((r / t) * 100)) : 0);

export default function DonatePage() {
  const params = useParams<{ id: string }>();
  const [info, setInfo] = useState<RoundDonateInfo | null>(null);
  const [charities, setCharities] = useState<OpenCharity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null); // wishlist item id
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{
    completed: boolean;
    fundedItemId: string;
    charity: CharityView | null;
  } | null>(null);

  async function load() {
    const [i, c] = await Promise.all([getRoundDonateInfo(params.id), listOpenWishlists()]);
    setInfo(i);
    setCharities(c);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [params.id]);

  async function submit() {
    if (!selected || !info) return;
    setErr("");
    setBusy(true);
    const res = await fundWishlist({ roundId: info.roundId, wishlistItemId: selected });
    if (!res.ok) {
      setBusy(false);
      return setErr(res.error);
    }
    const charity = await getCharity(res.charityId);
    setBusy(false);
    setDone({ completed: res.itemStatus === "completed", fundedItemId: res.itemId, charity });
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!info) return <div className="mt-10 text-center text-sm text-muted">라운드를 찾을 수 없어요.</div>;

  // 완료 화면 — 내 기부가 반영된 기부처의 진행율
  if (done) {
    const ch = done.charity;
    const chRaised = ch ? ch.items.reduce((s, i) => s + i.raised_amount, 0) : 0;
    const chTarget = ch ? ch.items.reduce((s, i) => s + i.target_cost, 0) : 0;
    return (
      <main>
        <ScreenHeader title="기부 완료" subtitle={info.roundName} back="/" />

        <div className="mt-6 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-5 text-center">
          <div className="text-3xl">{done.completed ? "🎉" : "💚"}</div>
          <div className="mt-1.5 text-base font-black text-joy">
            {done.completed ? "위시리스트 완주!" : "기부가 전달되었습니다"}
          </div>
          <div className="mt-0.5 text-[13px] font-black text-ink">{won(info.total)} 기부 반영</div>
        </div>

        {ch ? (
          <>
            {/* 기부처 전체 진행율 */}
            <div className="mt-4 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-white shadow-lg">
              <div className="text-xs font-bold opacity-85">{ch.name}</div>
              <div className="mt-1 text-lg font-black">함께 채운 진행율</div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/20">
                <div className="h-full rounded-full bg-white" style={{ width: `${pct(chRaised, chTarget)}%` }} />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div className="text-[26px] font-black tabular-nums leading-none">{pct(chRaised, chTarget)}%</div>
                <div className="text-right text-[11.5px] opacity-85">{won(chRaised)} / {won(chTarget)}</div>
              </div>
            </div>

            {/* 위시리스트별 진행율 (내가 채운 항목 강조) */}
            <section className="mt-5">
              <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">위시리스트 진행율</div>
              {ch.items.map((it) => {
                const mine = it.id === done.fundedItemId;
                const complete = it.status === "completed";
                return (
                  <div
                    key={it.id}
                    className={`mb-2 rounded-2xl border p-4 shadow-sm ${mine ? "border-forest bg-[#F1F6EF] ring-1 ring-forest/15" : "border-line bg-surface"}`}
                  >
                    <div className="flex items-center gap-2">
                      <b className="flex-1 text-[14px] font-black">{it.name}</b>
                      {mine && <span className="rounded-full bg-forest px-2 py-0.5 text-[10px] font-black text-white">내 기부 반영</span>}
                      {complete ? (
                        <span className="text-[11px] font-black text-joy">✓ 완주</span>
                      ) : (
                        <span className="text-[11px] font-bold text-muted">{pct(it.raised_amount, it.target_cost)}%</span>
                      )}
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                      <div
                        className={`h-full rounded-full ${complete ? "bg-joy" : "bg-forest"}`}
                        style={{ width: `${pct(it.raised_amount, it.target_cost)}%` }}
                      />
                    </div>
                    <div className="mt-1.5 text-[11.5px] font-bold text-muted">
                      {won(it.raised_amount)} / {won(it.target_cost)}
                    </div>
                  </div>
                );
              })}
            </section>

            <Link
              href={`/charities/${ch.id}`}
              className="mt-4 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg"
            >
              이 기부처 자세히 보기 →
            </Link>
          </>
        ) : null}

        <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">홈으로</Link>
      </main>
    );
  }

  // 이미 기부한 라운드
  if (info.alreadyFunded) {
    return (
      <main>
        <ScreenHeader title="기부하기" subtitle={info.roundName} back={`/rounds/${info.roundId}/settle`} />
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-3xl">✅</div>
          <div className="mt-2 text-base font-black text-ink">이미 기부가 완료된 라운드입니다</div>
          {info.fundedItemName && (
            <div className="mt-1 text-[13px] text-muted">“{info.fundedItemName}” 위시리스트에 반영됨</div>
          )}
        </div>
        <Link href="/nanum" className="mt-5 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white">나눔 완료 보기</Link>
        <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">홈으로</Link>
      </main>
    );
  }

  return (
    <main>
      <ScreenHeader title="기부하기" subtitle="위시리스트 채우기" back={`/rounds/${info.roundId}/settle`} />

      {/* 이번 라운드 금액 */}
      <div className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-5 text-center">
        <div className="text-xs font-bold text-[#4B7A5C]">이번 라운드 기부금</div>
        <div className="mt-1 text-[30px] font-black tabular-nums text-joy">{won(info.total)}</div>
        <div className="mt-1 text-[12px] font-bold text-muted">아래에서 채울 위시리스트를 선택하세요</div>
      </div>

      {info.total <= 0 && (
        <div className="mt-3 rounded-xl bg-[#FBEAE5] px-4 py-3 text-center text-[13px] font-bold text-[#B4472F]">
          적립된 기부금이 없습니다. 경기 진행에서 적립 후 다시 시도하세요.
        </div>
      )}

      {/* 위시리스트 선택 */}
      {charities.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-[14px] font-black text-ink">채울 수 있는 위시리스트가 없습니다</div>
          <div className="mt-1 text-[12.5px] text-muted">승인된 기부처의 위시리스트가 필요합니다.</div>
          <Link href="/charities/new" className="mt-4 block w-full rounded-2xl bg-forest p-3.5 text-[14px] font-black text-white">기부처 등록하기</Link>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          {charities.map((c) => (
            <section key={c.id}>
              <div className="mx-1 mb-2 flex items-center gap-2 text-xs font-black tracking-wide text-muted">
                {c.name}
                {c.tax_deductible && (
                  <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">세액공제</span>
                )}
              </div>
              {c.items.map((it) => {
                const on = selected === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(on ? null : it.id)}
                    className={`mb-2 block w-full rounded-2xl border-[1.5px] bg-surface p-4 text-left shadow-sm transition ${on ? "border-forest ring-2 ring-forest/15" : "border-line"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`grid h-5 w-5 flex-none place-items-center rounded-full border-[1.5px] text-[11px] text-white ${on ? "border-forest bg-forest" : "border-line"}`}
                      >
                        {on ? "✓" : ""}
                      </span>
                      <b className="flex-1 text-[14px] font-black">{it.name}</b>
                      <span className="text-[11.5px] font-bold text-muted">{pct(it.raised_amount, it.target_cost)}%</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#EAE5D6]">
                      <div className="h-full rounded-full bg-forest" style={{ width: `${pct(it.raised_amount, it.target_cost)}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11.5px] font-bold text-muted">
                      {won(it.raised_amount)} / {won(it.target_cost)}
                    </div>
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      )}

      {err && <div className="mt-3 rounded-xl bg-[#FBEAE5] px-4 py-3 text-center text-[13px] font-bold text-[#B4472F]">{err}</div>}

      {charities.length > 0 && (
        <button
          onClick={submit}
          disabled={busy || !selected || info.total <= 0}
          className="mt-5 w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg disabled:opacity-40"
        >
          {busy ? "기부 처리 중…" : selected ? `${won(info.total)} 이 위시리스트에 기부하기` : "위시리스트를 선택하세요"}
        </button>
      )}

      <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">홈으로</Link>
    </main>
  );
}
