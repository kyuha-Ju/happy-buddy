"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { getDepositSchedule, type DepositRound } from "@/app/admin/actions";

const KEY = "hb_admin_key";
const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const fmtDate = (s: string | null) => {
  if (!s) return "날짜 미정";
  const d = new Date(s);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${wd})`;
};

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DepositsPage() {
  const [rounds, setRounds] = useState<DepositRound[] | null>(null);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    let pw = "";
    try {
      pw = localStorage.getItem(KEY) || "";
    } catch {}
    if (!pw) {
      setDenied(true);
      return;
    }
    getDepositSchedule(pw).then((r) => {
      if (r === null) setDenied(true);
      else setRounds(r);
    });
  }, []);

  function exportAll() {
    if (!rounds) return;
    const rows: (string | number)[][] = [["날짜", "라운드", "골프장", "이름", "회원여부", "입금액(원)"]];
    rounds.forEach((r) => {
      r.members.forEach((m) => {
        rows.push([fmtDate(r.playDate), r.name, r.course || "", m.name, m.isMember ? "회원" : "비회원", m.amount]);
      });
    });
    downloadCsv("입금관리_전체.csv", rows);
  }

  if (denied) {
    return (
      <main>
        <ScreenHeader title="입금 관리" subtitle="운영자 전용" back="/admin" />
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <div className="mt-2 text-[14px] font-black text-ink">운영자 로그인이 필요합니다</div>
          <Link href="/admin" className="mt-4 block w-full rounded-2xl bg-forest p-3.5 text-[14px] font-black text-white">운영자 로그인</Link>
        </div>
      </main>
    );
  }

  if (rounds === null) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;

  const grandTotal = rounds.reduce((s, r) => s + r.total, 0);

  return (
    <main>
      <ScreenHeader title="입금 관리" subtitle="일자별 · 회원별" back="/admin" />

      <div className="mt-4 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-4 text-center">
        <div className="text-xs font-bold text-[#4B7A5C]">전체 입금 예정액</div>
        <div className="mt-1 text-[26px] font-black tabular-nums text-joy">{won(grandTotal)}</div>
        <div className="mt-0.5 text-[12px] font-bold text-muted">라운드 {rounds.length}개</div>
      </div>

      {rounds.length > 0 && (
        <button onClick={exportAll} className="mt-3 w-full rounded-2xl border-[1.5px] border-[#CDD6CB] bg-surface p-3 text-[13px] font-black text-forest">
          ⬇ 전체 입금 명단 다운로드 (엑셀)
        </button>
      )}

      {rounds.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center shadow-sm">
          <div className="text-[14px] font-black text-ink">입금 대상 라운드가 없습니다</div>
          <div className="mt-1 text-[12.5px] text-muted">경기에서 적립이 발생하면 여기에 표시됩니다.</div>
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {rounds.map((r) => (
            <div key={r.id} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-[13px] font-black text-forest">{fmtDate(r.playDate)}</div>
                  <div className="text-[12px] font-bold text-muted">{r.name}{r.course ? ` · ${r.course}` : ""}</div>
                </div>
                <div className="text-right">
                  <div className="text-[15px] font-black tabular-nums text-forest">{won(r.total)}</div>
                  <div className="text-[11px] font-bold text-muted">{r.members.length}명</div>
                </div>
              </div>
              <div className="mt-3 border-t border-line pt-2">
                {r.members.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-[13px] font-bold text-ink">
                      {m.name}
                      {!m.isMember && <span className="ml-1.5 rounded bg-[#F0ECE1] px-1.5 py-0.5 text-[10px] font-black text-[#96603a]">비회원</span>}
                    </span>
                    <span className="text-[14px] font-black tabular-nums text-forest-2">{won(m.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/admin" className="mt-6 block text-center text-sm font-bold text-muted">관리자 홈으로</Link>
    </main>
  );
}
