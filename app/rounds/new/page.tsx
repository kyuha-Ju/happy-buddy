"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getMemberByToken } from "@/app/me/actions";
import { createRound, searchMembers, type RoundEventInput, type MemberLite } from "@/app/rounds/actions";

const TOKEN_KEY = "hb_device_token";

const DEFAULT_EVENTS: RoundEventInput[] = [
  { name: "버디", amount: 10000, kind: "joy", enabled: true },
  { name: "이글", amount: 30000, kind: "joy", enabled: true },
  { name: "OB", amount: 5000, kind: "recover", enabled: true },
  { name: "3퍼트", amount: 3000, kind: "recover", enabled: false },
];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function NewRoundPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hostName, setHostName] = useState<string | null>(null);

  const [course, setCourse] = useState("");
  const [name, setName] = useState("정기 라운드");
  const [playDate, setPlayDate] = useState(todayStr());
  const [selected, setSelected] = useState<MemberLite[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberLite[]>([]);
  const [searching, startSearch] = useTransition();
  const [events, setEvents] = useState<RoundEventInput[]>(DEFAULT_EVENTS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
      setHostName(m.name);
      setChecking(false);
    });
  }, [router]);

  function doSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 1) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      const rows = await searchMembers(q);
      setResults(rows.filter((r) => !selected.some((s) => s.id === r.id)));
    });
  }
  function addMember(m: MemberLite) {
    setSelected((s) => (s.some((x) => x.id === m.id) ? s : [...s, m]));
    setQuery("");
    setResults([]);
  }
  function removeMember(id: string) {
    setSelected((s) => s.filter((x) => x.id !== id));
  }
  function maskPhone(p: string) {
    const d = (p || "").replace(/[^0-9]/g, "");
    if (d.length < 4) return p;
    return `${d.slice(0, 3)}-****-${d.slice(-4)}`;
  }
  function setEvent(i: number, patch: Partial<RoundEventInput>) {
    setEvents((evs) => evs.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  }
  function addCustomEvent() {
    setEvents((evs) => [...evs, { name: "", amount: 5000, kind: "joy", enabled: true, custom: true }]);
  }
  function removeEvent(i: number) {
    setEvents((evs) => evs.filter((_, idx) => idx !== i));
  }

  function onSubmit() {
    setError(null);
    if (!course.trim()) {
      setError("골프장(구장)을 입력해 주세요.");
      return;
    }
    let token = "";
    try {
      token = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    startTransition(async () => {
      const res = await createRound({
        hostToken: token,
        course,
        name,
        playDate,
        participants: selected.map((m) => ({ memberId: m.id, name: m.name })),
        events,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push(`/rounds/${res.roundId}/qr`);
    });
  }

  if (checking) {
    return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  }

  return (
    <main>
      <ScreenHeader title="새 라운드 만들기" subtitle="구장 · 참석자 · 룰" back="/" />

      {/* 라운드 정보 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">라운드 정보</div>
        <Field label="골프장">
          <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="예: 남서 CC" className="fld" />
        </Field>
        <Field label="라운드 이름">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 9월 정기 라운드" className="fld" />
        </Field>
        <Field label="날짜">
          <input type="date" value={playDate} onChange={(e) => setPlayDate(e.target.value)} className="fld" />
        </Field>
      </div>

      {/* 참석자 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">
          참석자 <span className="font-bold text-muted">· {selected.length + 1}명</span>
        </div>
        <div className="mt-1 text-[11.5px] text-muted">
          방장(나) 포함. 회원을 <b>이름·전화로 검색</b>해 추가하세요. 비회원은 <b>QR·입장코드로 들어올 때 회원가입</b>하면 자동 참여됩니다.
        </div>

        <div className="mt-3">
          <input
            value={query}
            onChange={(e) => doSearch(e.target.value)}
            placeholder="회원 이름 또는 전화번호 검색"
            className="w-full rounded-xl border-[1.5px] border-line bg-[#FAF8F2] px-3 py-2.5 text-sm outline-none focus:border-forest"
          />
          {query.trim() ? (
            <div className="mt-2 overflow-hidden rounded-xl border border-line bg-surface">
              {searching ? (
                <div className="px-3 py-2.5 text-[12px] text-muted">검색 중…</div>
              ) : results.length === 0 ? (
                <div className="px-3 py-2.5 text-[12px] text-muted">일치하는 회원이 없어요.</div>
              ) : (
                results.map((r) => (
                  <button key={r.id} type="button" onClick={() => addMember(r)} className="flex w-full items-center gap-3 border-t border-line px-3 py-2.5 text-left first:border-t-0">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-forest-2 text-[11px] font-black text-white">{r.name.slice(0, 2)}</div>
                    <div className="min-w-0 flex-1">
                      <b className="text-sm font-extrabold">{r.name}</b>
                      <div className="text-[11px] text-muted">{maskPhone(r.phone)}</div>
                    </div>
                    <span className="text-sm font-black text-forest">＋ 추가</span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-3 border-t border-line py-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-black text-white">나</div>
            <div className="flex-1 text-sm font-extrabold">{hostName} <span className="text-[11px] font-bold text-gold">방장</span></div>
          </div>
          {selected.map((m) => (
            <div key={m.id} className="flex items-center gap-3 border-t border-line py-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-forest-2 text-xs font-black text-white">{m.name.slice(0, 2)}</div>
              <div className="min-w-0 flex-1">
                <b className="text-sm font-extrabold">{m.name}</b>
                <div className="text-[11px] text-muted">{maskPhone(m.phone)}</div>
              </div>
              <button onClick={() => removeMember(m.id)} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-muted">빼기</button>
            </div>
          ))}
        </div>
      </div>

      {/* 룰 설정 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">룰 설정 (적립 이벤트)</div>
        <div className="mt-1 text-[11.5px] text-muted">이번 라운드에 적용할 조건만 켜세요. 금액도 바꿀 수 있어요.</div>
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-line py-3.5 first:border-t-0">
            <div className="min-w-0 flex-1">
              {e.custom ? (
                <input
                  value={e.name}
                  onChange={(ev) => setEvent(i, { name: ev.target.value })}
                  placeholder="룰 이름 (예: 롱기스트)"
                  className="w-full bg-transparent text-base font-black outline-none placeholder:text-muted/50"
                />
              ) : (
                <b className="text-base font-black">{e.name}</b>
              )}
              {e.custom ? (
                <button
                  type="button"
                  onClick={() => setEvent(i, { kind: e.kind === "joy" ? "recover" : "joy" })}
                  className={`mt-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${e.kind === "joy" ? "bg-[#E7F0E9] text-joy" : "bg-[#F6EADD] text-recover"}`}
                >
                  {e.kind === "joy" ? "기쁨기부" : "회복기부"} ⇄
                </button>
              ) : (
                <div className={`mt-0.5 text-[12px] font-bold ${e.kind === "joy" ? "text-joy" : "text-recover"}`}>
                  {e.kind === "joy" ? "기쁨기부" : "회복기부"}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={e.amount}
                onChange={(ev) => setEvent(i, { amount: parseInt(ev.target.value || "0", 10) })}
                className="w-[80px] rounded-lg border border-line bg-[#FAF8F2] px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-forest"
              />
              <span className="text-xs text-muted">원</span>
            </div>
            <button
              onClick={() => setEvent(i, { enabled: !e.enabled })}
              className={`relative h-[29px] w-[50px] flex-none rounded-full transition ${e.enabled ? "bg-forest-2" : "bg-[#CDD2C7]"}`}
              aria-label="toggle"
            >
              <span className={`absolute top-[3px] h-[23px] w-[23px] rounded-full bg-white shadow transition-all ${e.enabled ? "left-[24px]" : "left-[3px]"}`} />
            </button>
            {e.custom ? (
              <button onClick={() => removeEvent(i)} className="flex-none px-1 text-lg text-muted" aria-label="삭제">✕</button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={addCustomEvent}
          className="mt-3 rounded-xl bg-[#E4E9E1] px-4 py-2.5 text-[13px] font-bold text-forest"
        >
          ＋ 룰 직접 추가
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl bg-[#F6E4E0] px-4 py-3 text-sm font-bold text-[#B4472F]">{error}</div>
      ) : null}

      <button
        onClick={onSubmit}
        disabled={pending}
        className="mt-5 w-full rounded-2xl bg-forest p-4 text-base font-black text-white shadow-lg disabled:opacity-60"
      >
        {pending ? "개설 중…" : "라운드 개설 · 코드 발급"}
      </button>
      <Link href="/" className="mt-2 block text-center text-sm font-bold text-muted">취소</Link>

      <style>{`.fld{width:100%;background:transparent;text-align:right;font-size:14px;font-weight:600;color:var(--ink);outline:none}`}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-t border-line py-3 first:border-t-0">
      <span className="w-[76px] flex-none text-[13px] font-extrabold text-ink">{label}</span>
      {children}
    </div>
  );
}
