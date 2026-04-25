import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from "firebase/firestore";
import { CheckCircle2, Flame, ReceiptText } from "lucide-react";
import { db } from "@/lib/firebase";
import { formatBRL } from "@/data/menu";
import { OPERADORES_G, useAreaAccess } from "@/lib/access";

export const Route = createFileRoute("/churrasqueiro")({
  component: ChurrasqueiroPage,
  head: () => ({
    meta: [{ title: "Churrasqueiro - Comandas" }],
  }),
});

type ComandaStatus = "preparo" | "pronto" | "entregue";

type Comanda = {
  id: string;
  mesa: number;
  status: ComandaStatus;
  total: number;
  note?: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
};

function ChurrasqueiroPage() {
  const { carregando, autenticado, operador, autenticar, sair } = useAreaAccess("churrasqueiro");
  const [operadorSelecionado, setOperadorSelecionado] = useState("");
  const [senha, setSenha] = useState("");
  const [erroAcesso, setErroAcesso] = useState("");
  const [comandas, setComandas] = useState<Comanda[]>([]);

  useEffect(() => {
    if (!autenticado) return;
    const q = query(collection(db, "comandas"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Comanda[];
      setComandas(docs.filter((c) => c.status !== "entregue"));
    });
  }, [autenticado]);

  const concluirPedido = async (id: string) => {
    await updateDoc(doc(db, "comandas", id), {
      status: "pronto",
      finishedAt: new Date().toISOString(),
    });
  };

  const totalAbertas = comandas.length;

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
          <h1 className="mt-1 text-2xl font-black">Churrasqueiro</h1>
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
      <div className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Cozinha</p>
          <h1 className="inline-flex items-center gap-2 text-2xl font-black sm:text-3xl">
            <Flame className="h-6 w-6 text-primary" />
            Painel do Churrasqueiro
          </h1>
          <p className="text-xs text-muted-foreground">Operador ativo: {operador}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={sair}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-foreground"
          >
            Trocar operador
          </button>
        </div>
      </div>

      <div className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between rounded-2xl border border-white/10 bg-card/60 p-4">
        <p className="text-sm text-muted-foreground">Comandas abertas em tempo real</p>
        <p className="text-xl font-black">{totalAbertas}</p>
      </div>

      <section className="mx-auto w-full max-w-7xl rounded-3xl border border-white/10 bg-card/60 p-4">
        <h2 className="mb-3 text-lg font-black">Em Preparo</h2>
        <div className="space-y-3">
          {comandas.length === 0 ? (
            <p className="rounded-xl bg-black/15 p-4 text-sm text-muted-foreground">
              Nenhum pedido em preparo.
            </p>
          ) : (
            comandas.map((comanda) => (
              <article key={comanda.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-lg font-black">Mesa {comanda.mesa}</p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comanda.createdAt).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <ul className="mb-3 space-y-1 text-sm">
                  {comanda.items.map((item) => (
                    <li key={`${comanda.id}-${item.id}`} className="flex justify-between text-muted-foreground">
                      <span>
                        {item.quantity}x {item.name}
                      </span>
                      <span>{formatBRL(item.price * item.quantity)}</span>
                    </li>
                  ))}
                </ul>

                {comanda.note && (
                  <p className="mb-3 rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary">
                    Obs: {comanda.note}
                  </p>
                )}

                <p className="mb-3 text-right text-base font-black">{formatBRL(comanda.total)}</p>

                <button
                  onClick={() => concluirPedido(comanda.id)}
                  disabled={comanda.status === "pronto"}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {comanda.status === "pronto" ? "Pedido ja concluido" : "Pedido concluido"}
                </button>
              </article>
            ))
          )}
        </div>
      </section>

      <div className="mx-auto mt-6 w-full max-w-7xl rounded-2xl border border-white/10 bg-card/50 p-4 text-sm text-muted-foreground">
        <p className="inline-flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" />
          Fluxo: Garcom lanca direto em preparo - Cozinha conclui no botao Pedido concluido.
        </p>
      </div>
    </div>
  );
}
