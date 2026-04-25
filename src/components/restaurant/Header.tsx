import { ShoppingBag, Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { RESTAURANT } from "@/data/menu";

export function Header() {
  const { totalItems, openCart } = useCart();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-lg">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <Flame className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Delivery
            </p>
            <h1 className="text-base font-bold text-foreground sm:text-lg">{RESTAURANT.name}</h1>
          </div>
        </div>
        <button
          onClick={openCart}
          aria-label="Abrir carrinho"
          className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-secondary text-foreground ring-1 ring-white/10 transition-smooth hover:bg-secondary/70"
        >
          <ShoppingBag className="h-5 w-5" />
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground animate-bounce-in">
              {totalItems}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}