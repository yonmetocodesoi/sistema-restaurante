import { useState, type FormEvent } from "react";
import { ArrowLeft, Banknote, CreditCard, Smartphone } from "lucide-react";
import { z } from "zod";
import { formatBRL } from "@/data/menu";

export type CheckoutData = {
  name: string;
  address: string;
  payment: "Dinheiro" | "Pix" | "Cartão";
  changeFor?: string;
};

const schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe seu nome completo")
    .max(80, "Nome muito longo"),
  address: z
    .string()
    .trim()
    .min(8, "Endereço muito curto")
    .max(200, "Endereço muito longo"),
  payment: z.enum(["Dinheiro", "Pix", "Cartão"]),
  changeFor: z.string().optional(),
});

const paymentOptions: { value: CheckoutData["payment"]; icon: typeof Banknote }[] = [
  { value: "Dinheiro", icon: Banknote },
  { value: "Pix", icon: Smartphone },
  { value: "Cartão", icon: CreditCard },
];

export function CheckoutForm({
  total,
  onBack,
  onSubmit,
}: {
  total: number;
  onBack: () => void;
  onSubmit: (data: CheckoutData) => void;
}) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [payment, setPayment] = useState<CheckoutData["payment"]>("Pix");
  const [changeFor, setChangeFor] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse({ name, address, payment, changeFor });
    if (!result.success) {
      const map: Record<string, string> = {};
      result.error.issues.forEach((i) => {
        if (i.path[0]) map[String(i.path[0])] = i.message;
      });
      setErrors(map);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-smooth hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar ao carrinho
        </button>

        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="mb-1.5 block text-xs font-medium text-foreground">
              Nome do cliente
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="Como podemos te chamar?"
              className="h-11 w-full rounded-xl border border-input bg-input/30 px-4 text-sm text-foreground outline-none ring-primary/40 transition-smooth placeholder:text-muted-foreground focus:bg-input/60 focus:ring-2"
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="address" className="mb-1.5 block text-xs font-medium text-foreground">
              Endereço completo
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={200}
              rows={3}
              placeholder="Rua, número, bairro, complemento..."
              className="w-full resize-none rounded-xl border border-input bg-input/30 px-4 py-3 text-sm text-foreground outline-none ring-primary/40 transition-smooth placeholder:text-muted-foreground focus:bg-input/60 focus:ring-2"
            />
            {errors.address && <p className="mt-1 text-xs text-destructive">{errors.address}</p>}
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-foreground">Forma de pagamento</p>
            <div className="grid grid-cols-3 gap-2">
              {paymentOptions.map(({ value, icon: Icon }) => {
                const active = payment === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setPayment(value);
                      if (value !== "Dinheiro") setChangeFor("");
                    }}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition-smooth ${
                      active
                        ? "border-primary bg-primary/10 text-primary shadow-glow"
                        : "border-border bg-secondary/40 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {value}
                  </button>
                );
              })}
            </div>

            {payment === "Dinheiro" && (
              <div className="mt-4 animate-fade-in">
                <label
                  htmlFor="changeFor"
                  className="mb-1.5 block text-xs font-medium text-foreground"
                >
                  Troco para quanto? (Deixe vazio se não precisar)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    R$
                  </span>
                  <input
                    id="changeFor"
                    type="text"
                    inputMode="numeric"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value.replace(/\D/g, ""))}
                    placeholder="Ex: 50"
                    className="h-11 w-full rounded-xl border border-input bg-input/30 pl-10 pr-4 text-sm text-foreground outline-none ring-primary/40 transition-smooth focus:bg-input/60 focus:ring-2"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="border-t border-border bg-card/80 px-5 py-4 backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total do pedido</span>
          <span className="text-2xl font-extrabold text-foreground">{formatBRL(total)}</span>
        </div>
        <button
          type="submit"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-whatsapp text-base font-bold text-whatsapp-foreground shadow-float transition-bounce hover:scale-[1.02] active:scale-95"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          Enviar Pedido pelo WhatsApp
        </button>
      </footer>
    </form>
  );
}