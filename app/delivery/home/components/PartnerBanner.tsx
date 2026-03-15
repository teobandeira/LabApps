import Image from "next/image";

type PartnerBannerProps = {
  title: string;
  description: string;
  action: string;
  image: string;
};

export default function PartnerBanner({
  title,
  description,
  action,
  image,
}: PartnerBannerProps) {
  return (
    <article className="relative isolate overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm ring-1 ring-black/5">
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width: 640px) 50vw, 100vw"
        className="-z-10 object-cover"
        aria-hidden
      />
      <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#7a0911]/88 via-[#b31321]/72 to-[#ea1d2c]/58" />
      <div className="p-6 text-white sm:p-8">
        <h3 className="max-w-md text-2xl font-bold leading-tight">{title}</h3>
        <p className="mt-2 max-w-md text-sm text-zinc-100/95">{description}</p>
        <a
          href="#"
          className="mt-5 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
        >
          {action}
        </a>
      </div>
    </article>
  );
}
