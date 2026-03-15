import CouponBanner from "../../home/components/CouponBanner";
import CreateAccountButton from "../../home/components/CreateAccountButton";
import ItapoaLogo from "../../home/components/ItapoaLogo";

export type HeaderLink = {
  label: string;
  href: string;
};

type AppHeaderProps = {
  topLinks: HeaderLink[];
  menuLinks: HeaderLink[];
  logoHref?: string;
};

export default function AppHeader({
  topLinks,
  menuLinks,
  logoHref = "/delivery/home",
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur supports-backdrop-filter:bg-white/80">
      <div className="border-b border-zinc-100">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center gap-4 text-zinc-500">
            {topLinks.map((link) => (
              <a
                key={`${link.label}-${link.href}`}
                href={link.href}
                className="transition hover:text-zinc-900"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <CouponBanner compact />
            <CreateAccountButton />
            <a
              href="#"
              className="rounded-full px-3 py-1.5 text-zinc-700 transition hover:bg-zinc-100"
            >
              Entrar
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href={logoHref} className="inline-flex items-center">
          <ItapoaLogo />
        </a>
        <div className="hidden items-center gap-6 text-sm text-zinc-600 md:flex">
          {menuLinks.map((link) => (
            <a
              key={`${link.label}-${link.href}`}
              href={link.href}
              className="transition hover:text-zinc-900"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </header>
  );
}
