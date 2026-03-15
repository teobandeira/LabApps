import ItapoaLogo from "../../home/components/ItapoaLogo";

export default function AppFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm text-zinc-600 sm:grid-cols-3 sm:px-6 lg:px-8">
        <div>
          <ItapoaLogo compact />
          <p className="mt-2 text-zinc-500">
            © {new Date().getFullYear()} EasyDelivery. Todos os direitos reservados.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-zinc-900">EasyDelivery</p>
          <a href="#" className="block transition hover:text-zinc-900">
            Site institucional
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Conta e segurança
          </a>
          <a
            href="/delivery/meus-pedidos"
            className="block font-semibold text-[#ea1d2c] transition hover:text-[#c81422]"
          >
            Meus Pedidos
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Carreiras
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Entregadores
          </a>
        </div>
        <div className="space-y-2">
          <p className="font-semibold text-zinc-900">Descubra</p>
          <a href="#" className="block transition hover:text-zinc-900">
            Cadastre seu restaurante ou mercado
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Easy Shop
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Easy Benefícios
          </a>
          <a href="#" className="block transition hover:text-zinc-900">
            Termos e privacidade
          </a>
        </div>
      </div>
    </footer>
  );
}
