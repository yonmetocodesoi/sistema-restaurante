import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { CircleX, DollarSign, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { categories, formatBRL, products } from "@/data/menu";
import { OPERADORES_G, useAreaAccess, useRevenueVisibility } from "@/lib/access";

export const Route = createFileRoute("/caixa")({
  component: CaixaPage,
  head: () => ({
    meta: [{ title: "Caixa - Controle de Vendas" }],
  }),
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

type DailySummary = {
  date: string;
  revenue: number;
  closedTables: number;
};

type ContaImpressao = {
  tipo: "conta";
  mesa: number;
  total: number;
  fechadoEm: string;
  itens: Array<{ nome: string; quantidade: number; valorUnitario: number; subtotal: number }>;
};

const mesas = Array.from({ length: 30 }, (_, i) => i + 1);

declare global {
  interface Window {
    AndroidPrinter?: {
      printOrder?: (pedido: string) => void;
      printBill?: (conta: string) => void;
    };
  }
}

function CaixaPage() {
  const { carregando, autenticado, operador, autenticar, sair } = useAreaAccess("caixa");
  const { revenueHidden, toggleRevenueVisibility } = useRevenueVisibility();
  const [operadorSelecionado, setOperadorSelecionado] = useState("");
  const [senha, setSenha] = useState("");
  const [erroAcesso, setErroAcesso] = useState("");
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [mesaSelecionada, setMesaSelecionada] = useState<number | null>(null);
  const [tab, setTab] = useState(categories[0]?.id ?? "sanduiches");
  const [quantidades, setQuantidades] = useState<Record<string, number>>({});
  const [observacao, setObservacao] = useState("");
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  const [mostrarLancamento, setMostrarLancamento] = useState(false);
  const [modalMesaAberto, setModalMesaAberto] = useState(false);

  useEffect(() => {
    if (!autenticado) return;
    const q = query(collection(db, "comandas"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comanda[];
      setComandas(docs);
    });
  }, [autenticado]);

  useEffect(() => {
    if (!autenticado) return;
    const hoje = new Date().toISOString().slice(0, 10);
    return onSnapshot(doc(db, "daily_summaries", hoje), (snapshot) => {
      if (!snapshot.exists()) {
        setDailySummary({
          date: hoje,
          revenue: 0,
          closedTables: 0,
        });
        return;
      }
      const data = snapshot.data() as DailySummary;
      setDailySummary({
        date: data.date ?? hoje,
        revenue: data.revenue ?? 0,
        closedTables: data.closedTables ?? 0,
      });
    });
  }, [autenticado]);

  const mesasAbertas = useMemo(() => {
    const abertas = Array.from(
      new Set(comandas.filter((c) => c.status !== "entregue").map((c) => c.mesa)),
    ).sort((a, b) => a - b);
    return abertas;
  }, [comandas]);

  const resumoMesa = useMemo(() => {
    const mapa: Record<number, { comandas: number; total: number }> = {};
    for (const comanda of comandas) {
      if (comanda.status === "entregue") continue;
      if (!mapa[comanda.mesa]) {
        mapa[comanda.mesa] = { comandas: 0, total: 0 };
      }
      mapa[comanda.mesa].comandas += 1;
      mapa[comanda.mesa].total += comanda.total ?? 0;
    }
    return mapa;
  }, [comandas]);

  useEffect(() => {
    if (mesaSelecionada == null && mesasAbertas.length > 0) {
      setMesaSelecionada(mesasAbertas[0]);
    }
  }, [mesaSelecionada, mesasAbertas]);

  const comandasMesa = useMemo(
    () => comandas.filter((c) => c.mesa === mesaSelecionada && c.status !== "entregue"),
    [comandas, mesaSelecionada],
  );

  const itensAgregados = useMemo(() => {
    const mapa = new Map<string, { id: string; name: string; price: number; quantity: number }>();
    for (const comanda of comandasMesa) {
      for (const item of comanda.items) {
        const atual = mapa.get(item.id);
        if (atual) atual.quantity += item.quantity;
        else mapa.set(item.id, { ...item });
      }
    }
    return Array.from(mapa.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [comandasMesa]);

  const totalMesa = useMemo(
    () => comandasMesa.reduce((acc, c) => acc + c.total, 0),
    [comandasMesa],
  );
  const produtosDaCategoria = useMemo(
    () => products.filter((p) => p.categoryId === tab),
    [tab],
  );
  const itensSelecionadosNovoPedido = useMemo(
    () =>
      products
        .map((product) => ({
          ...product,
          quantity: quantidades[product.id] ?? 0,
        }))
        .filter((item) => item.quantity > 0),
    [quantidades],
  );
  const totalNovoPedido = useMemo(
    () => itensSelecionadosNovoPedido.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [itensSelecionadosNovoPedido],
  );

  const faturamentoHoje = dailySummary?.revenue ?? 0;

  const cancelarItem = async (itemId: string) => {
    const alvo = comandasMesa.find((comanda) => comanda.items.some((item) => item.id === itemId));
    if (!alvo) return;
    const items = alvo.items
      .map((item) =>
        item.id === itemId
          ? {
              ...item,
              quantity: item.quantity - 1,
            }
          : item,
      )
      .filter((item) => item.quantity > 0);
    const total = items.reduce((acc, item) => acc + item.price * item.quantity, 0);
    await updateDoc(doc(db, "comandas", alvo.id), {
      items,
      total,
      updatedAt: new Date().toISOString(),
      cancelledByCashier: true,
    });
  };

  const setItemQuantity = (id: string, quantity: number) => {
    setQuantidades((prev) => ({ ...prev, [id]: Math.max(0, quantity) }));
  };

  const limparNovoPedido = () => {
    setQuantidades({});
    setObservacao("");
  };

  const lancarComandaNoCaixa = async () => {
    if (mesaSelecionada == null || itensSelecionadosNovoPedido.length === 0 || enviandoPedido) return;
    setEnviandoPedido(true);
    try {
      await addDoc(collection(db, "comandas"), {
        mesa: mesaSelecionada,
        status: "preparo",
        total: totalNovoPedido,
        note: observacao.trim() || null,
        createdAt: new Date().toISOString(),
        source: "caixa",
        items: itensSelecionadosNovoPedido.map((item) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      });
      limparNovoPedido();
      alert(`Pedido lancado na mesa ${mesaSelecionada}.`);
    } catch (error) {
      console.error(error);
      alert("Nao foi possivel lancar o pedido no caixa.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const fecharVendaMesa = async () => {
    if (mesaSelecionada == null || comandasMesa.length === 0) return;

    const contaParaImpressao: ContaImpressao = {
      tipo: "conta",
      mesa: mesaSelecionada,
      total: totalMesa,
      fechadoEm: new Date().toISOString(),
      itens: itensAgregados.map((item) => ({
        nome: item.name,
        quantidade: item.quantity,
        valorUnitario: item.price,
        subtotal: item.price * item.quantity,
      })),
    };

    const hoje = new Date().toISOString().slice(0, 10);
    try {
      await setDoc(
        doc(db, "daily_summaries", hoje),
        {
          date: hoje,
          revenue: increment(totalMesa),
          closedTables: increment(1),
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );
    } catch (error) {
      console.warn("Falha ao atualizar resumo diario, usando fallback sales:", error);
      await addDoc(collection(db, "sales"), {
        mesa: mesaSelecionada,
        total: totalMesa,
        createdAt: new Date().toISOString(),
        comandaIds: comandasMesa.map((c) => c.id),
        items: itensAgregados,
      });
    }
    await Promise.all(
      comandasMesa.map((comanda) =>
        updateDoc(doc(db, "comandas", comanda.id), {
          status: "entregue",
          closedAt: new Date().toISOString(),
        }),
      ),
    );

    // No APK Android, imprime conta da mesa ao fechar venda.
    if (typeof window !== "undefined" && window.AndroidPrinter) {
      try {
        const payload = JSON.stringify(contaParaImpressao);
        if (window.AndroidPrinter.printBill) {
          window.AndroidPrinter.printBill(payload);
        } else if (window.AndroidPrinter.printOrder) {
          window.AndroidPrinter.printOrder(payload);
        }
      } catch (error) {
        console.error("Falha ao acionar impressao da conta:", error);
      }
    }

    alert(`Venda da mesa ${mesaSelecionada} registrada com sucesso.`);
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-card/60 p-6">
          <p className="text-sm text-muted-foreground">Carregando acesso...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
        <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-card/60 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Acesso restrito</p>
          <h1 className="mt-1 text-2xl font-black">Caixa</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Selecione o operador e informe a senha secreta para continuar.
          </p>
          <div className="mt-4 space-y-3">
            <select
              value={operadorSelecionado}
              onChange={(e) => setOperadorSelecionado(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none"
            >
              <option value="">Selecione o operador</option>
              {OPERADORES_G.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Senha secreta"
              className="w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none"
            />
            {erroAcesso && <p className="text-sm text-red-400">{erroAcesso}</p>}
            <button
              onClick={() => {
                const result = autenticar(operadorSelecionado, senha);
                if (!result.ok) {
                  setErroAcesso(result.error);
                  return;
                }
                setErroAcesso("");
                setSenha("");
              }}
              className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground"
            >
              Entrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto mb-6 flex w-full max-w-7xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Financeiro</p>
          <h1 className="text-2xl font-black sm:text-3xl">Caixa</h1>
          <p className="text-xs text-muted-foreground">Operador ativo: {operador}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={toggleRevenueVisibility}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold"
          >
            {revenueHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {revenueHidden ? "Mostrar faturamento" : "Ocultar faturamento"}
          </button>
          <button
            onClick={sair}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold"
          >
            Trocar operador
          </button>
        </div>
      </div>

      <div className="mx-auto mb-6 grid w-full max-w-7xl gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Faturamento de hoje</p>
          <p className="mt-1 inline-flex items-center gap-2 text-2xl font-black">
            <DollarSign className="h-5 w-5 text-primary" />
            {revenueHidden ? "R$ ••••" : formatBRL(faturamentoHoje)}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-card/60 p-4">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Mesas abertas</p>
          <p className="mt-1 text-2xl font-black">{mesasAbertas.length}</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-card/60 p-4">
        <section className="rounded-3xl border border-white/10 bg-card/60 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Mesas (clique para gerenciar)
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
            {mesas.map((mesa) => (
              <button
                key={mesa}
                onClick={() => {
                  setMesaSelecionada(mesa);
                  setMostrarLancamento(false);
                  setModalMesaAberto(true);
                }}
                className={`relative rounded-xl px-2 py-4 text-center text-sm font-bold transition ${
                  mesaSelecionada === mesa
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/70 hover:bg-primary hover:text-primary-foreground"
                }`}
              >
                <p>Mesa {mesa}</p>
                <p className="mt-1 text-[11px] font-semibold opacity-85">{formatBRL(resumoMesa[mesa]?.total ?? 0)}</p>
                {(resumoMesa[mesa]?.comandas ?? 0) > 0 && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-black">
                    {resumoMesa[mesa]?.comandas}
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>
      </div>

      {mesaSelecionada != null && modalMesaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/10 bg-background p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Mesa {mesaSelecionada}</h2>
                <p className="text-sm text-muted-foreground">Total da conta: {formatBRL(totalMesa)}</p>
              </div>
              <button
                onClick={() => {
                  setModalMesaAberto(false);
                  setMostrarLancamento(false);
                }}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm font-bold"
              >
                Fechar
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <button
                onClick={() => setMostrarLancamento((prev) => !prev)}
                className="flex-1 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
              >
                {mostrarLancamento ? "Fechar lancamento" : "Lancar Produto"}
              </button>
              <button
                onClick={fecharVendaMesa}
                disabled={comandasMesa.length === 0}
                className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
              >
                Conta / Finalizar Mesa
              </button>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
              <section className="rounded-2xl border border-white/10 bg-card/60 p-3">
                {mostrarLancamento ? (
                  <>
                    <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                      {produtosDaCategoria.map((product) => {
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
                      })}
                    </div>

                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      placeholder="Observacao para a cozinha"
                      className="mt-3 h-20 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm outline-none placeholder:text-muted-foreground"
                    />

                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Itens: <span className="font-bold text-foreground">{itensSelecionadosNovoPedido.length}</span>
                      </p>
                      <p className="text-xl font-black">{formatBRL(totalNovoPedido)}</p>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={limparNovoPedido}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-sm font-bold"
                      >
                        <Trash2 className="h-4 w-4" />
                        Limpar
                      </button>
                      <button
                        onClick={lancarComandaNoCaixa}
                        disabled={itensSelecionadosNovoPedido.length === 0 || enviandoPedido}
                        className="flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-black text-primary-foreground disabled:opacity-50"
                      >
                        {enviandoPedido ? "Enviando..." : "Lancar Pedido"}
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Clique em <span className="font-bold text-foreground">Lancar Produto</span> para abrir o lancamento
                    ou em <span className="font-bold text-foreground">Conta / Finalizar Mesa</span> para fechar.
                  </p>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-card/60 p-3">
                <h3 className="mb-2 text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Itens lancados
                </h3>
                {itensAgregados.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem itens nessa mesa.</p>
                ) : (
                  <div className="space-y-2">
                    {itensAgregados.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 p-2"
                      >
                        <div>
                          <p className="font-semibold">
                            {item.quantity}x {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{formatBRL(item.price * item.quantity)}</p>
                        </div>
                        <button
                          onClick={() => cancelarItem(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs font-bold text-red-400"
                        >
                          <CircleX className="h-3.5 w-3.5" />
                          Cancelar 1
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
