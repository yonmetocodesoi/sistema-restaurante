import heroBanner from "@/assets/hero-banner.jpg";
import { Star, Clock, MapPin } from "lucide-react";

export function Hero({ onCTA }: { onCTA: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="relative h-[68vh] min-h-[540px] w-full sm:h-[78vh]">
        <img
          src={heroBanner}
          alt="Espetinhos grelhados na brasa"
          width={1920}
          height={1080}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[10s] ease-linear hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/35 to-transparent" />
        <div className="absolute inset-0 bg-black/45" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_15%,rgba(255,179,71,0.1),transparent_32%)]" />

        <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col justify-end px-4 pb-10 sm:px-6 sm:pb-16">
          <div className="glass-card animate-slide-up max-w-3xl rounded-3xl p-6 ring-1 ring-white/10 sm:p-8">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary backdrop-blur-md ring-1 ring-primary/40">
              🔥 Aberto agora
            </span>
            <h2 className="mt-5 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-6xl">
              O melhor sabor <br />
              <span className="bg-primary-gradient bg-clip-text text-transparent [text-shadow:0_1px_1px_rgba(0,0,0,0.35)]">
                da&nbsp;brasa
              </span>{" "}
              direto pra você.
            </h2>
            <p className="mt-4 max-w-xl text-sm font-medium text-foreground/80 sm:text-lg">
              Sanduíches artesanais, sucos naturais e bebidas geladas. <br className="hidden sm:block" />
              Peça em segundos e receba em casa.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-5 text-xs font-semibold text-foreground/75 sm:text-sm">
              <span className="inline-flex items-center gap-2">
                <Star className="h-4 w-4 fill-primary text-primary" /> 4.9 (500+ avaliações)
              </span>
              <span className="inline-flex items-center gap-2 border-l border-border/50 pl-6">
                <Clock className="h-4 w-4 text-primary" /> 25–40 min
              </span>
              <span className="inline-flex items-center gap-2 border-l border-border/50 pl-6">
                <MapPin className="h-4 w-4 text-primary" /> Entrega Grátis*
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={onCTA}
                className="inline-flex h-12 items-center justify-center rounded-full bg-primary-gradient px-8 text-base font-black text-primary-foreground shadow-glow transition-bounce hover:scale-[1.03] active:scale-95 sm:h-14 sm:px-10 sm:text-lg"
              >
                Fazer meu pedido
              </button>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-foreground/70">
                Entrega rapida na sua regiao
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
