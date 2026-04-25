import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OPERADORES_G, useAreaAccess } from "@/lib/access";

export const Route = createFileRoute("/garcom")({
  component: GarcomPage,
  head: () => ({
    meta: [{ title: "Garcom - Lancamento de Mesas" }],
  }),
});

type Comanda = {
  id: string;
  mesa: number;
  status: "pendente" | "preparo" | "pronto" | "entregue";
  total: number;
};

const mesas = Array.from({ length: 30 }, (_, i) => i + 1);

function GarcomPage() {
  const matchRoute = useMatchRoute();
  const mesaSelecionada = matchRoute({ to: "/garcom/mesa/$mesaId" });
  const { carregando, autenticado, operador, autenticar, sair } = useAreaAccess("garcom");
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
      setComandas(docs);
    });
  }, [autenticado]);

  const comandasAbertasPorMesa = useMemo(() => {
    const mapa: Record<number, number> = {};
    for (const comanda of comandas) {
      if (comanda.status !== "entregue") {
        mapa[comanda.mesa] = (mapa[comanda.mesa] ?? 0) + 1;
      }
    }
    return mapa;
  }, [comandas]);

  const totalAbertoPorMesa = useMemo(() => {
    const mapa: Record<number, number> = {};
    for (const comanda of comandas) {
      if (comanda.status !== "entregue") {
        mapa[comanda.mesa] = (mapa[comanda.mesa] ?? 0) + (comanda.total ?? 0);
      }
    }
    return mapa;
  }, [comandas]);

  const formatBRL = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

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
          <h1 className="mt-1 text-2xl font-black">Garcom</h1>
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

  if (mesaSelecionada) {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-foreground md:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Atendimento</p>
          <h1 className="text-2xl font-black sm:text-3xl">Garcom - Mesas</h1>
          <p className="text-xs text-muted-foreground">Operador ativo: {operador}</p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <button
            onClick={sair}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-white/15 px-4 py-2 text-sm font-bold sm:flex-none"
          >
            Trocar operador
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl rounded-3xl border border-white/10 bg-card/60 p-4">
        <section className="rounded-3xl border border-white/10 bg-card/60 p-4">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Clique em uma mesa para abrir o lancamento aqui no app
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10">
            {mesas.map((mesa) => {
              const abertas = comandasAbertasPorMesa[mesa] ?? 0;
              const totalMesa = totalAbertoPorMesa[mesa] ?? 0;
              return (
                <Link
                  key={mesa}
                  to="/garcom/mesa/$mesaId"
                  params={{ mesaId: String(mesa) }}
                  className="relative rounded-xl bg-secondary/70 px-2 py-4 text-center text-sm font-bold transition hover:bg-primary hover:text-primary-foreground"
                >
                  <p>Mesa {mesa}</p>
                  <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{formatBRL(totalMesa)}</p>
                  {abertas > 0 && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-amber-500 px-1.5 text-[10px] text-black">
                      {abertas}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
