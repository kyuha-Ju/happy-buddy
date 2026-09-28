"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { joinRound } from "@/app/rounds/actions";

const TOKEN_KEY = "hb_device_token";

export default function JoinPage() {
  const params = useParams<{ token: string }>();
  const [state, setState] = useState<"loading" | "joined" | "needSignup" | "error">("loading");
  const [roundName, setRoundName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let memberToken = "";
    try {
      memberToken = localStorage.getItem(TOKEN_KEY) || "";
    } catch {}
    if (!memberToken) {
      setState("needSignup");
      return;
    }
    joinRound(params.token, memberToken).then((res) => {
      if (res.ok) {
        setRoundName(res.roundName);
        setState("joined");
      } else if (res.needSignup) {
        setState("needSignup");
      } else {
        setMsg(res.error || "입장에 실패했어요.");
        setState("error");
      }
    });
  }, [params.token]);

  return (
    <main>
      <ScreenHeader title="라운드 입장" subtitle="QR·코드 참여" back="/" />

      {state === "loading" && <div className="mt-10 text-center text-sm text-muted">입장 처리 중…</div>}

      {state === "joined" && (
        <div className="mt-6 rounded-2xl border border-[#CFE3D4] bg-[#E7F0E9] p-6 text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-2 text-lg font-black text-joy">입장 완료!</div>
          <div className="mt-1 text-sm font-bold text-ink">{roundName} 라운드에 참여했습니다.</div>
          <Link href="/mypage" className="mt-5 block w-full rounded-2xl bg-forest p-4 text-[15px] font-black text-white">마이페이지로</Link>
        </div>
      )}

      {state === "needSignup" && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-3xl">🙋</div>
          <div className="mt-2 text-base font-black text-ink">참여하려면 회원가입이 필요합니다</div>
          <div className="mt-1 text-[13px] leading-relaxed text-muted">
            이름·전화번호만 넣으면 끝(인증 없음). 가입 후 이 링크로 다시 들어오면 자동으로 참여됩니다.
          </div>
          <Link href={`/me?next=/join/${params.token}`} className="mt-5 block w-full rounded-2xl bg-forest p-4 text-[15px] font-black text-white">회원가입 하기</Link>
          <Link href={`/login?next=/join/${params.token}`} className="mt-2 block w-full rounded-2xl bg-[#E4E9E1] p-3.5 text-sm font-extrabold text-forest">이미 회원이면 로그인</Link>
        </div>
      )}

      {state === "error" && (
        <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-sm font-bold text-[#B4472F]">{msg}</div>
          <Link href="/" className="mt-4 block text-sm font-bold text-muted">홈으로</Link>
        </div>
      )}
    </main>
  );
}
