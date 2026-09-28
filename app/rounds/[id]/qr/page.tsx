"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import QRCode from "qrcode";
import ScreenHeader from "@/components/ScreenHeader";
import { getRound, type RoundView } from "@/app/rounds/actions";

export default function RoundQRPage() {
  const params = useParams<{ id: string }>();
  const [round, setRound] = useState<RoundView | null>(null);
  const [loading, setLoading] = useState(true);
  const [qr, setQr] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getRound({ id: params.id }).then((r) => {
      setRound(r);
      setLoading(false);
      if (r) {
        const url = `${window.location.origin}/join/${r.qr_token}`;
        QRCode.toDataURL(url, { width: 240, margin: 1, color: { dark: "#26302A", light: "#ffffff" } })
          .then(setQr)
          .catch(() => {});
      }
    });
  }, [params.id]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  }
  function copyLink() {
    if (!round) return;
    const url = `${window.location.origin}/join/${round.qr_token}`;
    try {
      navigator.clipboard?.writeText(url);
      flash("입장 링크가 복사되었습니다");
    } catch {
      flash("복사 실패 — 주소를 직접 공유하세요");
    }
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;
  if (!round) return <div className="mt-10 text-center text-sm text-muted">라운드를 찾을 수 없어요.</div>;

  return (
    <main className="relative">
      <ScreenHeader title="방 입장 QR" subtitle="회원에게 보여주세요" back="/" />

      <div className="mt-4 rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-6 text-center text-white shadow-lg">
        <div className="inline-block rounded-full bg-white/15 px-3.5 py-2 text-xs font-extrabold">📱 이 화면을 보여주세요</div>
        <div className="mt-4 text-lg font-black">{round.name}</div>
        <div className="mt-0.5 text-[13px] font-bold text-white/80">{round.course} · 방장 {round.players.find((p) => p.joined_via === "host")?.display_name ?? ""}</div>

        <div className="mx-auto mt-4 inline-block rounded-2xl bg-white p-3">
          {qr ? <img src={qr} alt="입장 QR" width={200} height={200} className="block h-[200px] w-[200px]" /> : <div className="h-[200px] w-[200px]" />}
        </div>

        <div className="mt-3">
          <div className="text-[11px] font-bold text-white/70">입장 코드</div>
          <div className="text-[38px] font-black tracking-[0.14em] tabular-nums">{round.join_code}</div>
        </div>
        <div className="mt-2 text-[11.5px] leading-relaxed text-white/80">
          회원이 QR을 찍거나 코드를 입력하면 참여됩니다.<br />비회원은 입장 시 <b>회원가입</b>이 필요합니다.
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={copyLink} className="flex-1 rounded-xl bg-white/15 px-2 py-3 text-[12.5px] font-extrabold">🔗 링크 복사</button>
          <button onClick={() => flash(`입장 코드 ${round.join_code}`)} className="flex-1 rounded-xl bg-white/15 px-2 py-3 text-[12.5px] font-extrabold">🔢 코드</button>
          <button onClick={() => flash("카카오톡 공유 (준비 중)")} className="flex-1 rounded-xl bg-white/15 px-2 py-3 text-[12.5px] font-extrabold">💬 카톡</button>
        </div>
      </div>

      {/* 참석자 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">참석자 · {round.players.length}명</div>
        {round.players.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-t-0">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-forest-2 text-[11px] font-black text-white">{p.display_name.slice(0, 2)}</div>
            <div className="flex-1 text-sm font-bold">{p.display_name}</div>
            <div className="text-[11px] font-bold text-muted">{p.joined_via === "host" ? "방장" : p.member_id ? "회원" : "대기(비회원)"}</div>
          </div>
        ))}
      </div>

      {/* 룰 요약 */}
      <div className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <div className="text-[13px] font-black text-forest">적립 룰</div>
        {round.events.map((e, i) => (
          <div key={i} className="flex items-center justify-between border-t border-line py-2.5 first:border-t-0">
            <span className="text-sm font-extrabold">{e.name}</span>
            <span className={`text-sm font-black ${e.kind === "joy" ? "text-joy" : "text-recover"}`}>+{e.amount.toLocaleString("ko-KR")}원</span>
          </div>
        ))}
      </div>

      <Link href={`/rounds/${round.id}/play`} className="mt-5 block w-full rounded-2xl bg-forest p-4 text-center text-base font-black text-white shadow-lg">경기 시작하기 →</Link>
      <Link href="/" className="mt-2 block w-full rounded-2xl bg-[#E4E9E1] p-3.5 text-center text-[15px] font-extrabold text-forest">홈으로</Link>

      {toast ? (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[12.5px] font-bold text-white shadow-lg">{toast}</div>
      ) : null}
    </main>
  );
}
