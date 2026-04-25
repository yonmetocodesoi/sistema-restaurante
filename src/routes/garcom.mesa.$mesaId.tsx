import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { addDoc, collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { categories, formatBRL, products } from "@/data/menu";
import { getOperadorSalvo } from "@/lib/access";

type PedidoImpressao = {
  mesa: number;
  garcom: string;
  observacoes: string;
  itens: Array<{ nome: string; quantidade: number; observacao: string }>;
};

type ContaMesaImpressao = {
  tipo: "conta";
  origem: "garcom_mesa";
  mesa: number;
  total: number;
  emitidoEm: string;
  itens: Array<{ nome: string; quantidade: number; valorUnitario: number; subtotal: number }>;
};

declare global {
  interface Window {
    AndroidPrinter?: {
      printOrder?: (pedido: string) => void;
      printBill?: (conta: string) => void;
    };
  }
}

export const Route = createFileRoute("/garcom/mesa/$mesaId")({
  component: GarcomMesaPage,
});

type Comanda = {
  id: string;
  mesa: number;
  status: "pendente" | "preparo" | "pronto" | "entregue";
  total: number;
  createdAt: string;
  note?: string;
  items: Array<{ id: string; name: string; price: number; quantity: number }>;
};

function GarcomMesaPage() {
  const { mesaId } = Route.useParams();
  const mesa = Number(mesaId);
  const [tab, setTab] = useState(categories[0]?.id ?? "sanduiches");
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [feedbackImpressao, setFeedbackImpressao] = useState<{
    tipo: "sucesso" | "erro";
    mensagem: string;
  } | null>(null);
  const garcomNome = getOperadorSalvo("garcom") || "Garcom App";

  useEffect(() => {
    const q = query(collection(db, "comandas"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comanda[];
      setComandas(docs.filter((c) => c.mesa === mesa && c.status !== "entregue"));
    });
  }, [mesa]);

  const itensSelecionados = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          quantity: quantidades[product.id] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [quantidades],
  );

  const total = useMemo(
    () => itensSelecionados.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [itensSelecionados],
  );

  const produtosDaCategoria = useMemo(
    () => products.filter((p) => p.categoryId === tab),
    [tab],
  );
  const totalMesaAberta = useMemo(
    () => comandas.reduce((acc, comanda) => acc + comanda.total, 0),
    [comandas],
  );
  const itensMesaAgregados = useMemo(() => {
    const mapa = new Map<string, { nome: string; quantidade: number; valorUnitario: number; subtotal: number }>();
    for (const comanda of comandas) {
      for (const item of comanda.items) {
        const atual = mapa.get(item.id);
        if (atual) {
          atual.quantidade += item.quantity;
          atual.subtotal += item.price * item.quantity;
        } else {
          mapa.set(item.id, {
            nome: item.name,
            quantidade: item.quantity,
            valorUnitario: item.price,
            subtotal: item.price * item.quantity,
          });
        }
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [comandas]);

  const setItemQuantity = (id: string, quantity: number) => {
    setQuantidades((prev) => ({ ...prev, [id]: Math.max(0, quantity) }));
  };

  const limparPedido = () => {
    setQuantidades({});
    setObservacao("");
  };

  const lancarComanda = async () => {
    if (itensSelecionados.length === 0 || enviando) return;
    setEnviando(true);

    const pedidoParaImpressao: PedidoImpressao = {
      mesa,
      garcom: garcomNome,
      observacoes: observacao.trim(),
      itens: itensSelecionados.map((item) => ({
        nome: item.name,
        quantidade: item.quantity,
        observacao: "",
      })),
    };

    try {
      const salvarComandaPromise = addDoc(collection(db, "comandas"), {
        mesa,
        status: "preparo",
        total,
        note: observacao.trim() || null,
        createdAt: new Date().toISOString(),
        source: "garcom",
        items: itensSelecionados.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });

      // No APK Android, o JavaScriptInterface AndroidPrinter recebe o pedido
      // e envia para impressora termica na rede local (Socket TCP 9100).
      if (typeof window !== "undefined" && window.AndroidPrinter?.printOrder) {
        try {
          window.AndroidPrinter.printOrder(JSON.stringify(pedidoParaImpressao));
        } catch (error) {
          console.error("Falha ao acionar impressao local:", error);
        }
      }

      await salvarComandaPromise;
      limparPedido();
      alert(`Comanda da mesa ${mesa} enviada para cozinha.`);
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel lancar a comanda.");
    } finally {
      setEnviando(false);
    }
  };

  const imprimirContaMesa = () => {
    setFeedbackImpressao(null);
    if (comandas.length === 0) {
      setFeedbackImpressao({
        tipo: "erro",
        mensagem: "Nao ha comandas abertas para imprimir a conta dessa mesa.",
      });
      return;
    }

    const conta: ContaMesaImpressao = {
      tipo: "conta",
      origem: "garcom_mesa",
      mesa,
      total: totalMesaAberta,
      emitidoEm: new Date().toISOString(),
      itens: itensMesaAgregados,
    };

    if (typeof window !== "undefined" && window.AndroidPrinter) {
      try {
        const payload = JSON.stringify(conta);
        if (window.AndroidPrinter.printBill) {
          window.AndroidPrinter.printBill(payload);
        } else if (window.AndroidPrinter.printOrder) {
          window.AndroidPrinter.printOrder(payload);
        } else {
          setFeedbackImpressao({
            tipo: "erro",
            mensagem: "Impressora nao disponivel no app.",
          });
          return;
        }
        setFeedbackImpressao({
          tipo: "sucesso",
          mensagem: `Conta da mesa ${mesa} enviada para impressao.`,
        });
      } catch (error) {
        console.error("Falha ao imprimir conta da mesa:", error);
        setFeedbackImpressao({
          tipo: "erro",
          mensagem: "Nao foi possivel imprimir a conta agora.",
        });
      }
      return;
    }

    setFeedbackImpressao({
      tipo: "erro",
      mensagem: "Impressao disponivel apenas no APK com AndroidPrinter configurado.",
    });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Atendimento</p>
          <h1 className="text-2xl font-black sm:text-3xl">Mesa {mesa}</h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Link
            to="/garcom"
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-secondary px-4 py-2 text-sm font-bold sm:flex-none"
          >
            Voltar Mesas
          </Link>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-card/60 p-4">
          <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setTab(cat.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold ${
                  tab === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary/80"
                }`}
              >
                {cat.emoji} {cat.name}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {produtosDaCategoria.length === 0 ? (
              <p className="rounded-xl border border-white/10 bg-black/15 p-4 text-sm text-muted-foreground">
                Sem produtos nessa categoria.
              </p>
            ) : (
              produtosDaCategoria.map((product) => {
                const quantity = quantidades[product.id] ?? 0;
                return (
                  <article
                    key={product.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 p-3"
                  >
                    <div>
                      <p className="font-semibold">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{formatBRL(product.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setItemQuantity(product.id, quantity - 1)}
                        className="h-9 w-9 rounded-full bg-secondary text-base font-black"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-bold">{quantity}</span>
                      <button
                        onClick={() => setItemQuantity(product.id, quantity + 1)}
                        className="h-9 w-9 rounded-full bg-primary text-primary-foreground"
                      >
                        <Plus className="mx-auto h-4 w-4" />
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-card/60 p-4 lg:sticky lg:top-4 lg:self-start">
          <h2 className="mb-2 text-lg font-black">Resumo da mesa</h2>
          <div className="mb-3 rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Total em aberto da mesa</p>
            <p className="text-2xl font-black text-primary">{formatBRL(totalMesaAberta)}</p>
          </div>
          <div className="space-y-1 rounded-xl border border-white/10 bg-black/15 p-3 text-sm">
            {itensSelecionados.length === 0 ? (
              <p className="text-muted-foreground">Nenhum item selecionado.</p>
            ) : (
              itensSelecionados.map((item) => (
                <p key={item.id} className="flex justify-between">
                  <span>
                    {item.quantity}x {item.name}
                  </span>
                  <span>{formatBRL(item.quantity * item.price)}</span>
                </p>
              ))
            )}
          </div>

          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Observacao para a cozinha"
            className="mt-3 h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none placeholder:text-muted-foreground"
          />

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Itens: <span className="font-bold text-foreground">{itensSelecionados.length}</span>
            </p>
            <p className="text-xl font-black">{formatBRL(total)}</p>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              onClick={limparPedido}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </button>
            <button
              onClick={lancarComanda}
              disabled={itensSelecionados.length === 0 || enviando}
              className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
            >
              {enviando ? "Enviando..." : "Lancar Comanda"}
            </button>
          </div>
          <button
            onClick={imprimirContaMesa}
            disabled={comandas.length === 0}
            className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 text-sm font-black disabled:opacity-50"
          >
            Imprimir Conta da Mesa
          </button>
          {feedbackImpressao && (
            <div
              className={`mt-2 rounded-xl border px-3 py-2 text-sm ${
                feedbackImpressao.tipo === "sucesso"
                  ? "border-green-500/40 bg-green-500/10 text-green-300"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              {feedbackImpressao.mensagem}
            </div>
          )}

          <div className="mt-4 rounded-xl border border-white/10 bg-black/15 p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Comandas abertas</p>
            {comandas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma comanda aberta nessa mesa.</p>
            ) : (
              <div className="space-y-2">
                {comandas.map((comanda) => (
                  <div key={comanda.id} className="rounded-lg border border-white/10 p-2 text-xs">
                    <div className="mb-1 flex justify-between">
                      <span className="font-bold">{formatBRL(comanda.total)}</span>
                      <span className="uppercase text-primary">{comanda.status}</span>
                    </div>
                    {comanda.items.map((item) => (
                      <p key={`${comanda.id}-${item.id}`} className="text-muted-foreground">
                        {item.quantity}x {item.name}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
