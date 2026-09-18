import Link from "next/link";

function Row({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="mt-2.5 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3.5"
    >
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#EEF3EC] text-lg">{icon}</span>
      <span className="min-w-0 flex-1">
        <b className="block text-sm font-black">{title}</b>
        <small className="text-[11.5px] text-muted">{sub}</small>
      </span>
      <span className="text-lg text-muted">›</span>
    </Link>
  );
}

export default function Home() {
  return (
    <main className="pt-4">
      <div className="rounded-[22px] bg-gradient-to-b from-forest to-[#20362A] p-5 text-white shadow-lg">
        <div className="text-sm font-bold opacity-90">안녕하세요 👋</div>
        <div className="mt-0.5 text-xl font-black">산들모임</div>
        <div className="mt-3.5 flex gap-2">
          {[
            ["누적 기부", "210만원"],
            ["버디 수", "47"],
            ["함께한 기간", "6개월"],
          ].map(([k, v]) => (
            <div key={k} className="flex-1 rounded-xl bg-white/10 px-1.5 py-2.5 text-center">
              <div className="text-[10.5px] opacity-80">{k}</div>
              <div className="mt-0.5 text-base font-black tabular-nums">{v}</div>
            </div>
          ))}
        </div>
      </div>

      <Link
        href="/rounds/new"
        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-[18px] bg-forest p-5 text-lg font-black text-white shadow-lg"
      >
        🏌️ 게임 시작
      </Link>
      <Link
        href="/charities/new"
        className="mt-2.5 flex w-full items-center justify-center rounded-2xl border-[1.5px] border-[#CDD6CB] bg-surface p-4 text-[15px] font-extrabold text-forest"
      >
        ＋ 기부처 등록하기
      </Link>

      <div className="mx-1 mt-5 text-xs font-black tracking-wide text-forest">바로가기</div>
      <Row href="/me" icon="🙋" title="회원가입 · 내 정보" sub="이름·전화만 · 인증 없음" />
      <Row href="/charities" icon="🎁" title="기부처" sub="위시리스트를 함께 채워요" />
      <Row href="/nanum" icon="🏆" title="나눔 완료" sub="완주한 위시리스트" />
    </main>
  );
}
