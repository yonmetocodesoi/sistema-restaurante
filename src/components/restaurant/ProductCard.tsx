import { Plus, Check } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL, type Product } from "@/data/menu";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1100);
  };

  return (
    <article className="group glass-card animate-slide-up flex gap-3 overflow-hidden rounded-2xl p-3 ring-1 ring-border/50 transition-smooth hover:-translate-y-0.5 hover:ring-primary/40">
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
        <img
          src={product.image}
          alt={product.name}
          width={300}
          height={300}
          loading="lazy"
          className="h-full w-full object-cover transition-smooth group-hover:scale-110"
        />
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <div>
          <h3 className="text-base font-bold leading-tight text-foreground">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{product.description}</p>
        </div>
        <div className="mt-2 flex items-end justify-between">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-extrabold text-primary">
            {formatBRL(product.price)}
          </span>
          <button
            onClick={handleAdd}
            aria-label={`Adicionar ${product.name} ao carrinho`}
            className={`relative flex h-9 items-center justify-center gap-1 overflow-hidden rounded-full px-3 text-xs font-semibold transition-bounce active:scale-90 ${
              added
                ? "bg-success text-white shadow-lg shadow-success/20"
                : "bg-primary-gradient text-primary-foreground shadow-glow hover:scale-105"
            }`}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" />
                Adicionado
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Adicionar
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}