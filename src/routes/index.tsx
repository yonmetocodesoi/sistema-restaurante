import { createFileRoute } from "@tanstack/react-router";
import { CartProvider } from "@/contexts/CartContext";
import { Header } from "@/components/restaurant/Header";
import { Hero } from "@/components/restaurant/Hero";
import { Menu } from "@/components/restaurant/Menu";
import { CartDrawer } from "@/components/restaurant/CartDrawer";
import { FloatingButtons } from "@/components/restaurant/FloatingButtons";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Espetinho do João — Peça pelo WhatsApp" },
      {
        name: "description",
        content:
          "Sanduíches artesanais, sucos naturais e bebidas geladas do Espetinho do João. Peça em segundos pelo WhatsApp.",
      },
      { property: "og:title", content: "Espetinho do João — Delivery" },
      {
        property: "og:description",
        content: "O melhor sabor da brasa direto pra você. Peça pelo WhatsApp.",
      },
    ],
  }),
});

function Index() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
      setScrollProgress(progress);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToMenu = () => {
    const el = document.getElementById("menu");
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  return (
    <CartProvider>
      <div className="min-h-screen bg-background">
        <div className="animated-bg" />
        <div
          className="fixed inset-x-0 top-0 z-50 h-[3px] origin-left bg-primary-gradient shadow-glow"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
        <Header />
        <main>
          <Hero onCTA={scrollToMenu} />
          <Menu />
        </main>
        <footer className="border-t border-border bg-card/50 px-4 py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Espetinho do João — Feito com 🔥 e sabor.
        </footer>
        <CartDrawer />
        <FloatingButtons />
      </div>
    </CartProvider>
  );
}
