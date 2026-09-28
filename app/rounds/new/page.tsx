"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getMemberByToken } from "@/app/me/actions";
import { createRound, type RoundEventInput } from "@/app/rounds/actions";

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
  const [participants, setParticipants] = useState<string[]>([]);
  const [newP, setNewP] = useState("");
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

  function addParticipant() {
    const n = newP.trim();
    if (!n) return;
    setParticipants((p) => [...p, n]);
    setNewP("");
  }
  function setEvent(i: number, patch: Partial<RoundEventInput>) {
    setEvents((evs) => evs.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
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
        participants,
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
          참석자 <span className="font-bold text-muted">· {participants.length + 1}명</span>
        </div>
        <div className="mt-1 text-[11.5px] text-muted">
          방장(나) 포함. 비회원은 발급되는 <b>QR·입장코드로 들어올 때 회원가입</b>하면 자동 참여됩니다.
        </div>
        <div className="mt-3 flex items-center gap-3 border-t border-line py-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-forest text-xs font-black text-white">나</div>
          <div className="flex-1 text-sm font-extrabold">{hostName} <span className="text-[11px] font-bold text-gold">방장</span></div>
        </div>
        {participants.map((p, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-line py-3">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-forest-2 text-xs font-black text-white">{p.slice(0, 2)}</div>
            <div className="flex-1 text-sm font-extrabold">{p}</div>
            <button onClick={() => setParticipants((arr) => arr.filter((_, idx) => idx !== i))} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-muted">빼기</button>
          </div>
        ))}
        <div className="mt-3 flex gap-2">
          <input
            value={newP}
            onChange={(e) => setNewP(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addParticipant(); } }}
            placeholder="참석자 이름 추가"
            className="min-w-0 flex-1 rounded-xl border-[1.5px] border-line bg-[#FAF8F2] px-3 py-2.5 text-sm outline-none focus:border-forest"
          />
          <button onClick={addParticipant} className="rounded-xl bg-[#E4E9E1] px-4 text-sm font-extrabold text-forest">추가</button>
        </div>
      </div>

      {/* 룰 설정 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">룰 설정 (적립 이벤트)</div>
        <div className="mt-1 text-[11.5px] text-muted">이번 라운드에 적용할 조건만 켜세요. 금액도 바꿀 수 있어요.</div>
        {events.map((e, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-line py-3.5 first:border-t-0">
            <div className="flex-1">
              <b className="text-base font-black">{e.name}</b>
              <div className={`mt-0.5 text-[12px] font-bold ${e.kind === "joy" ? "text-joy" : "text-recover"}`}>
                {e.kind === "joy" ? "기쁨기부" : "회복기부"}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={e.amount}
                onChange={(ev) => setEvent(i, { amount: parseInt(ev.target.value || "0", 10) })}
                className="w-[86px] rounded-lg border border-line bg-[#FAF8F2] px-2 py-1.5 text-right text-sm font-bold outline-none focus:border-forest"
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
          </div>
        ))}
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
