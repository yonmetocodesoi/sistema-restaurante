import { useState } from "react";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { formatBRL, RESTAURANT } from "@/data/menu";
import { CheckoutForm, type CheckoutData } from "./CheckoutForm";

export function CartDrawer() {
  const { isOpen, closeCart, items, totalPrice, increment, decrement, removeItem, clearCart } =
    useCart();
  const [stage, setStage] = useState<"cart" | "checkout">("cart");

  if (!isOpen) return null;

  const DELIVERY_FEE = 5.0;
  const finalTotal = totalPrice + DELIVERY_FEE;

  const handleSubmit = async (data: CheckoutData) => {
    try {
      const orderData = {
        customer: data,
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          quantity: i.quantity,
          price: i.product.price,
        })),
        subtotal: totalPrice,
        deliveryFee: DELIVERY_FEE,
        total: finalTotal,
        status: "pending",
        createdAt: new Date().toISOString(),
      };

      // Salvar no Firebase
      const { db } = await import("@/lib/firebase");
      const { collection, addDoc } = await import("firebase/firestore");
      await addDoc(collection(db, "orders"), orderData);

      const lines = items
        .map((i) => `• ${i.quantity}x ${i.product.name} — ${formatBRL(i.product.price * i.quantity)}`)
        .join("\n");

      let paymentInfo = `💳 *Pagamento:* ${data.payment}`;
      if (data.payment === "Dinheiro" && data.changeFor) {
        paymentInfo += ` (Troco para ${formatBRL(Number(data.changeFor))})`;
      }

      const message = `📦 *Novo Pedido — ${RESTAURANT.name}*\n\n${lines}\n\n💰 *Subtotal:* ${formatBRL(totalPrice)}\n🚚 *Taxa de Entrega:* ${formatBRL(DELIVERY_FEE)}\n💵 *Total Final:* ${formatBRL(finalTotal)}\n\n👤 *Nome:* ${data.name}\n📍 *Endereço:* ${data.address}\n${paymentInfo}`;

      const url = `https://wa.me/${RESTAURANT.whatsapp}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
      clearCart();
      closeCart();
      setStage("cart");
    } catch (error) {
      console.error("Erro ao registrar pedido:", error);
      alert("Ocorreu um erro ao processar seu pedido. Tente novamente.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        aria-label="Fechar carrinho"
        onClick={closeCart}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-fade-in"
      />
      <aside className="animate-slide-in-right relative flex h-full w-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-[linear-gradient(180deg,oklch(0.2_0.03_260_/_0.95),oklch(0.14_0.02_260_/_0.96))] shadow-float">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(255,170,70,0.14),transparent_35%)]" />
        <header className="relative flex items-center justify-between border-b border-border bg-card/70 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">
              {stage === "cart" ? "Seu Carrinho" : "Finalizar Pedido"}
            </h2>
          </div>
          <button
            onClick={() => {
              closeCart();
              setStage("cart");
            }}
            aria-label="Fechar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground ring-1 ring-white/10 transition-smooth hover:bg-secondary/70"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
              <ShoppingBag className="h-9 w-9 text-muted-foreground" />
            </div>
            <p className="text-base font-medium text-foreground">Seu carrinho está vazio</p>
            <p className="text-sm text-muted-foreground">
              Adicione itens deliciosos para começar seu pedido.
            </p>
            <button
              onClick={closeCart}
              className="mt-2 rounded-full bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-bounce hover:scale-105"
            >
              Ver Cardápio
            </button>
          </div>
        ) : stage === "cart" ? (
          <>
            <div className="scroll-shadow relative flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-3">
                {items.map((i) => (
                  <li
                    key={i.product.id}
                    className="animate-fade-in flex gap-3 rounded-xl bg-gradient-card p-3 ring-1 ring-white/10"
                  >
                    <img
                      src={i.product.image}
                      alt={i.product.name}
                      width={80}
                      height={80}
                      loading="lazy"
                      className="h-16 w-16 rounded-lg object-cover"
                    />
                    <div className="flex flex-1 flex-col justify-between">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{i.product.name}</h3>
                        <button
                          onClick={() => removeItem(i.product.id)}
                          aria-label={`Remover ${i.product.name}`}
                          className="text-muted-foreground transition-smooth hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 rounded-full bg-black/20 p-1 ring-1 ring-white/10">
                          <button
                            onClick={() => decrement(i.product.id)}
                            aria-label="Diminuir"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground transition-smooth hover:bg-primary hover:text-primary-foreground"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-foreground">
                            {i.quantity}
                          </span>
                          <button
                            onClick={() => increment(i.product.id)}
                            aria-label="Aumentar"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-card text-foreground transition-smooth hover:bg-primary hover:text-primary-foreground"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-bold text-primary">
                          {formatBRL(i.product.price * i.quantity)}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <footer className="border-t border-white/10 bg-card/70 px-5 py-4 backdrop-blur">
              <div className="mb-4 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium text-foreground">{formatBRL(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Entrega</span>
                  <span className="font-medium text-primary">{formatBRL(DELIVERY_FEE)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <span className="text-base font-bold text-foreground">Total</span>
                  <span className="text-2xl font-extrabold text-foreground">
                    {formatBRL(finalTotal)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setStage("checkout")}
                className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-primary text-base font-bold text-primary-foreground shadow-glow transition-bounce hover:scale-[1.02] active:scale-95"
              >
                Finalizar Pedido
              </button>
            </footer>
          </>
        ) : (
          <CheckoutForm
            total={finalTotal}
            onBack={() => setStage("cart")}
            onSubmit={handleSubmit}
          />
        )}
      </aside>
    </div>
  );
}