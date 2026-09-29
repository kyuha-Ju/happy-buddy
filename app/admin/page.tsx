"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ScreenHeader from "@/components/ScreenHeader";
import { verifyAdmin, getAdminData, adminApprove, adminReject, type AdminData } from "@/app/admin/actions";

const KEY = "hb_admin_key";
const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const money = (n: number) => (n >= 10000 ? Math.round(n / 10000).toLocaleString("ko-KR") + "만원" : won(n));

export default function AdminPage() {
  const [pass, setPass] = useState("");
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function load(pw: string) {
    const d = await getAdminData(pw);
    if (d) {
      setData(d);
      setAuthed(true);
    }
    return d;
  }

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem(KEY) || "";
    } catch {}
    if (saved) {
      setPass(saved);
      load(saved).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login() {
    setErr("");
    const v = await verifyAdmin(pass);
    if (!v.configured) {
      setErr("운영자 비밀번호가 아직 설정되지 않았습니다. Vercel 환경변수 ADMIN_PASSCODE를 먼저 등록하세요.");
      return;
    }
    if (!v.ok) {
      setErr("비밀번호가 올바르지 않습니다.");
      return;
    }
    try {
      localStorage.setItem(KEY, pass);
    } catch {}
    await load(pass);
  }

  async function refresh() {
    const d = await getAdminData(pass);
    if (d) setData(d);
  }

  async function approve(id: string) {
    setBusy(id);
    await adminApprove(pass, id);
    await refresh();
    setBusy(null);
  }
  async function reject(id: string) {
    setBusy(id);
    await adminReject(pass, id);
    await refresh();
    setBusy(null);
  }

  function logout() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    setAuthed(false);
    setData(null);
    setPass("");
  }

  if (loading) return <div className="mt-10 text-center text-sm text-muted">불러오는 중…</div>;

  // 로그인 화면
  if (!authed) {
    return (
      <main>
        <ScreenHeader title="운영자" subtitle="관리자 전용" back="/" />
        <div className="mt-8 rounded-2xl border border-line bg-surface p-6 text-center shadow-sm">
          <div className="text-3xl">🔒</div>
          <div className="mt-2 text-base font-black text-ink">운영자 로그인</div>
          <div className="mt-1 text-[12.5px] text-muted">사장님 전용 화면입니다. 비밀번호를 입력하세요.</div>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
            placeholder="운영자 비밀번호"
            className="mt-4 w-full rounded-xl border border-line bg-paper px-3.5 py-3 text-center text-[15px] font-bold outline-none focus:border-forest"
          />
          {err && <div className="mt-3 rounded-xl bg-[#FBEAE5] px-3 py-2.5 text-[12.5px] font-bold text-[#B4472F]">{err}</div>}
          <button onClick={login} className="mt-4 w-full rounded-2xl bg-forest p-3.5 text-[15px] font-black text-white">로그인</button>
        </div>
        <Link href="/" className="mt-4 block text-center text-sm font-bold text-muted">홈으로</Link>
      </main>
    );
  }

  // 관리자 대시보드
  return (
    <main>
      <ScreenHeader title="운영자" subtitle="관리자 대시보드" back="/" />

      {/* 통계 */}
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <Stat k="누적 기부" v={data ? money(data.totalDonated) : "…"} />
        <Stat k="회원 수" v={data ? `${data.memberCount}명` : "…"} />
        <Stat k="라운드 수" v={data ? `${data.roundCount}개` : "…"} />
        <Stat k="승인된 기부처" v={data ? `${data.approvedCount}곳` : "…"} />
      </div>

      {/* 승인 대기 */}
      <section className="mt-6">
        <div className="mx-1 mb-2 text-xs font-black tracking-wide text-muted">
          기부처 승인 대기 · {data?.pendingCount ?? 0}
        </div>
        {!data || data.pending.length === 0 ? (
          <div className="rounded-xl bg-surface/60 py-8 text-center text-[12.5px] text-muted">승인 대기 중인 기부처가 없습니다.</div>
        ) : (
          data.pending.map((c) => (
            <div key={c.id} className="mb-2 rounded-2xl border border-[#E4D9B8] bg-[#FBF7EA] p-4">
              <div className="flex items-center gap-2">
                <b className="text-[15px] font-black text-ink">{c.name}</b>
                {c.tax_deductible && <span className="rounded-full bg-[#E7F0E9] px-2 py-0.5 text-[10px] font-black text-joy">세액공제</span>}
              </div>
              {c.description && <div className="mt-1 text-[12.5px] text-muted">{c.description}</div>}
              <div className="mt-1 text-[11.5px] font-bold text-muted">위시리스트 {c.item_count}개 · 목표 {won(c.target_total)}</div>
              <div className="mt-3 flex gap-2">
                <button disabled={busy === c.id} onClick={() => approve(c.id)} className="flex-1 rounded-xl bg-forest py-2.5 text-[13px] font-black text-white disabled:opacity-50">승인</button>
                <button disabled={busy === c.id} onClick={() => reject(c.id)} className="flex-1 rounded-xl bg-[#F0ECE1] py-2.5 text-[13px] font-black text-[#96603a] disabled:opacity-50">반려</button>
              </div>
            </div>
          ))
        )}
      </section>

      <div className="mt-6 flex justify-center gap-6 text-sm font-bold text-muted">
        <Link href="/charities">기부처 목록</Link>
        <button onClick={logout}>로그아웃</button>
      </div>
    </main>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-2xl border-2 border-forest/15 bg-surface px-4 py-3.5 text-center">
      <div className="text-[11px] font-bold text-muted">{k}</div>
      <div className="mt-1 text-lg font-black tabular-nums text-forest">{v}</div>
    </div>
  );
}
