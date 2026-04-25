import { useEffect, useRef, useState } from "react";
import { categories, products } from "@/data/menu";
import { CategoryTabs } from "./CategoryTabs";
import { ProductCard } from "./ProductCard";

export function Menu() {
  const [active, setActive] = useState(categories[0].id);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleSelect = (id: string) => {
    setActive(id);
    const el = sectionRefs.current[id];
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 130;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute("data-cat-id");
            if (id) setActive(id);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="menu" className="mx-auto max-w-5xl px-4 pb-32 pt-2">
      <CategoryTabs active={active} onSelect={handleSelect} />
      <div className="space-y-10 pt-6">
        {categories.map((cat) => {
          const items = products.filter((p) => p.categoryId === cat.id);
          return (
            <div
              key={cat.id}
              data-cat-id={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="scroll-mt-32"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
                  <span className="text-2xl">{cat.emoji}</span> {cat.name}
                </h2>
                <span className="rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
                  {items.length} itens
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}