type SectionTitleProps = {
  title: string;
  cta?: string;
};

export default function SectionTitle({ title, cta }: SectionTitleProps) {
  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
        {title}
      </h2>
      {cta && (
        <a
          href="#"
          className="text-sm font-semibold text-[#ea1d2c] transition hover:text-[#c81422]"
        >
          {cta}
        </a>
      )}
    </div>
  );
}
