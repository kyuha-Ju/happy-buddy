import Link from "next/link";

export default function ScreenHeader({
  title,
  subtitle,
  back,
}: {
  title: string;
  subtitle?: string;
  back?: string;
}) {
  return (
    <header className="flex items-center gap-3 pt-4">
      {back ? (
        <Link
          href={back}
          className="grid h-9 w-9 place-items-center rounded-full border border-line bg-surface text-forest"
          aria-label="뒤로"
        >
          ←
        </Link>
      ) : null}
      <div className="ml-auto text-right">
        <b className="block text-[19px] font-black text-ink">{title}</b>
        {subtitle ? (
          <small className="text-[12.5px] font-bold text-forest-2">
            {subtitle}
          </small>
        ) : null}
      </div>
    </header>
  );
}
