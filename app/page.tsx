import Link from "next/link";
import TopAuthButton from "@/components/TopAuthButton";

function Tile({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex-1 rounded-2xl border-2 border-forest/15 bg-surface px-4 py-3.5 text-center">
      <div className="text-[11px] font-bold text-muted">{k}</div>
      <div className="mt-1 text-lg font-black tabular-nums text-forest">{v}</div>
    </div>
  );
}

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
    <main className="pt-5">
      <div className="flex items-center justify-between">
        <div className="text-[22px] font-black tracking-tight text-forest">HAPPY BUDDY</div>
        <TopAuthButton />
      </div>

      <div className="mt-5 flex gap-2.5">
        <Tile k="누적 기부" v="210만원" />
        <Tile k="참여 인원" v="201명" />
      </div>

      <Link
        href="/rounds/new"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] bg-forest p-5 text-lg font-black tracking-wide text-white shadow-lg"
      >
        🏌️ ROUND START
      </Link>

      <div className="mx-1 mt-6 text-xs font-black tracking-wide text-forest">바로가기</div>
      <Row href="/me" icon="🙋" title="회원가입 · 내 정보" sub="이름·전화만 · 인증 없음" />
      <Row href="/charities" icon="🎁" title="기부처" sub="위시리스트를 함께 채워요" />
      <Row href="/nanum" icon="🏆" title="나눔 완료" sub="완주한 위시리스트" />

      <Link
        href="/charities/new"
        className="mt-4 flex w-full items-center justify-center rounded-2xl border-[1.5px] border-[#CDD6CB] bg-surface p-4 text-[15px] font-extrabold text-forest"
      >
        ＋ 기부처 등록하기
      </Link>
    </main>
  );
}
