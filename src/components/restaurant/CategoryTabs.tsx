import { categories } from "@/data/menu";

export function CategoryTabs({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="sticky top-[57px] z-30 -mx-4 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-lg">
      <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {categories.map((c) => {
          const isActive = c.id === active;
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-smooth ${
                isActive
                  ? "border-transparent bg-gradient-primary text-primary-foreground shadow-glow"
                  : "border-border/70 bg-secondary/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <span className="mr-1.5">{c.emoji}</span>
              {c.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}