"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScreenHeader from "@/components/ScreenHeader";
import { createCharity, type WishItemInput } from "@/app/charities/actions";

const TOKEN_KEY = "hb_device_token";

type Row = { name: string; cost: string };

export default function NewCharityPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [taxOn, setTaxOn] = useState(false);
  const [taxNo, setTaxNo] = useState("");
  const [rows, setRows] = useState<Row[]>([{ name: "", cost: "" }]);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      setToken(localStorage.getItem(TOKEN_KEY) || "");
    } catch {}
  }, []);

  function setRow(i: number, patch: Partial<Row>) {
    setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  }
  function addRow() {
    setRows((r) => [...r, { name: "", cost: "" }]);
  }
  function removeRow(i: number) {
    setRows((r) => (r.length === 1 ? r : r.filter((_, idx) => idx !== i)));
  }

  async function submit() {
    setErr("");
    const items: WishItemInput[] = rows
      .map((r) => ({ name: r.name.trim(), targetCost: parseInt(r.cost.replace(/[^0-9]/g, ""), 10) || 0 }))
      .filter((i) => i.name && i.targetCost > 0);
    if (!name.trim()) return setErr("기관 이름을 입력해 주세요.");
    if (items.length === 0) return setErr("위시리스트 품목(품목명·예상비용)을 1개 이상 입력해 주세요.");

    setBusy(true);
    const res = await createCharity({
      hostToken: token || undefined,
      name,
      description: desc,
      taxDeductible: taxOn,
      taxNo,
      items,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.error);
    setDone(true);
  }

  if (done) {
    return (
      <main>
        <ScreenHeader title="기부처 등록" subtitle="접수 완료" back="/charities" />
        <div className="mt-8 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-6 text-center">
          <div className="text-3xl">📮</div>
          <div className="mt-2 text-lg font-black text-joy">등록 접수 완료!</div>
          <div className="mt-1 text-[13px] leading-relaxed text-ink">
            운영자 승인 후 기부처 목록에 노출됩니다.
          </div>
          <button
            onClick={() => router.push("/charities")}
            className="mt-5 block w-full rounded-2xl bg-forest p-4 text-[15px] font-black text-white"
          >
            기부처 목록으로
          </button>
        </div>
      </main>
    );
  }

  return (
    <main>
      <ScreenHeader title="기부처 등록" subtitle="누구나 등록 · 승인 후 노출" back="/charities" />

      {/* 기관 정보 */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">기관 정보</div>
        <label className="mt-3 block text-[12px] font-bold text-muted">기관 이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예) 행복한 지역아동센터"
          className="mt-1 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-[15px] font-bold outline-none focus:border-forest"
        />
        <label className="mt-3 block text-[12px] font-bold text-muted">소개 (선택)</label>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={2}
          placeholder="어떤 곳인지, 무엇이 필요한지 간단히"
          className="mt-1 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-3 text-[14px] font-medium outline-none focus:border-forest"
        />
      </section>

      {/* 세액공제 */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <button
          onClick={() => setTaxOn((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
        >
          <span
            className={`grid h-6 w-6 flex-none place-items-center rounded-md border-[1.5px] text-white ${taxOn ? "border-forest bg-forest" : "border-line bg-paper"}`}
          >
            {taxOn ? "✓" : ""}
          </span>
          <span className="flex-1">
            <b className="block text-[14px] font-black text-ink">세액공제(기부금영수증) 가능</b>
            <small className="text-[11.5px] text-muted">기부처가 홈택스 전자기부금영수증을 발급할 수 있는 경우</small>
          </span>
        </button>
        {taxOn && (
          <input
            value={taxNo}
            onChange={(e) => setTaxNo(e.target.value)}
            placeholder="고유번호 / 사업자번호"
            className="mt-3 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-[15px] font-bold outline-none focus:border-forest"
          />
        )}
      </section>

      {/* 위시리스트 */}
      <section className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">위시리스트</div>
        <div className="mt-1 text-[11.5px] text-muted">필요한 물품과 예상 비용을 적어주세요. 모임 기부금으로 채워집니다.</div>
        {rows.map((r, i) => (
          <div key={i} className="mt-3 flex items-center gap-2">
            <input
              value={r.name}
              onChange={(e) => setRow(i, { name: e.target.value })}
              placeholder="품목 (예: 겨울 이불)"
              className="min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2.5 text-[14px] font-bold outline-none focus:border-forest"
            />
            <input
              value={r.cost}
              onChange={(e) => setRow(i, { cost: e.target.value })}
              inputMode="numeric"
              placeholder="예상비용"
              className="w-[92px] flex-none rounded-xl border border-line bg-paper px-3 py-2.5 text-right text-[14px] font-bold tabular-nums outline-none focus:border-forest"
            />
            <button
              onClick={() => removeRow(i)}
              className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[#F0ECE1] text-[#96603a]"
              aria-label="삭제"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={addRow}
          className="mt-3 w-full rounded-xl border-[1.5px] border-dashed border-line py-2.5 text-[13px] font-black text-forest"
        >
          ＋ 품목 추가
        </button>
      </section>

      {err && <div className="mt-3 rounded-xl bg-[#FBEAE5] px-4 py-3 text-center text-[13px] font-bold text-[#B4472F]">{err}</div>}

      <button
        onClick={submit}
        disabled={busy}
        className="mt-5 w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg disabled:opacity-50"
      >
        {busy ? "등록 중…" : "등록 신청하기"}
      </button>
    </main>
  );
}
