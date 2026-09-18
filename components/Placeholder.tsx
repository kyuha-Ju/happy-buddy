import ScreenHeader from "@/components/ScreenHeader";

/**
 * 뼈대 단계용 자리표시 화면. 각 라우트의 실제 UI/로직은 마일스톤에서 구현.
 */
export default function Placeholder({
  title,
  subtitle,
  back = "/",
  note,
}: {
  title: string;
  subtitle?: string;
  back?: string;
  note?: string;
}) {
  return (
    <main>
      <ScreenHeader title={title} subtitle={subtitle} back={back} />
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-sm">
        <p className="text-sm font-bold text-ink">🚧 준비 중 화면 (뼈대)</p>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          {note ?? "이 화면의 실제 기능은 개발 마일스톤에서 구현됩니다. 라우트/구조 확인용 자리표시입니다."}
        </p>
      </div>
    </main>
  );
}
