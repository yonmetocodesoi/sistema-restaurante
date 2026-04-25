import { useEffect, useState } from "react";

const SECRET = "lincinho2026";
const STORAGE_PREFIX = "cardapio_access_";
const REVENUE_VISIBILITY_KEY = "cardapio_revenue_hidden";

export const OPERADORES_G = ["G1", "G2", "G3", "G4", "G5", "G6"] as const;

type Sessao = {
  operador: string;
  at: string;
};

export function getOperadorSalvo(area: string): string {
  if (typeof window === "undefined") return "";
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${area}`);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as Sessao;
    return parsed.operador ?? "";
  } catch {
    return "";
  }
}

export function clearAcesso(area: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(`${STORAGE_PREFIX}${area}`);
}

export function useAreaAccess(area: string) {
  const [carregando, setCarregando] = useState(true);
  const [operador, setOperador] = useState("");
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = getOperadorSalvo(area);
    if (saved) {
      setOperador(saved);
      setAutenticado(true);
    }
    setCarregando(false);
  }, [area]);

  const autenticar = (operadorSelecionado: string, senha: string) => {
    if (!operadorSelecionado) {
      return { ok: false as const, error: "Selecione o operador." };
    }
    if (senha !== SECRET) {
      return { ok: false as const, error: "Senha invalida." };
    }
    const payload: Sessao = {
      operador: operadorSelecionado,
      at: new Date().toISOString(),
    };
    if (typeof window !== "undefined") {
      window.localStorage.setItem(`${STORAGE_PREFIX}${area}`, JSON.stringify(payload));
    }
    setOperador(operadorSelecionado);
    setAutenticado(true);
    return { ok: true as const };
  };

  const sair = () => {
    clearAcesso(area);
    setAutenticado(false);
    setOperador("");
  };

  return { carregando, autenticado, operador, autenticar, sair };
}

export function useRevenueVisibility() {
  const [revenueHidden, setRevenueHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(REVENUE_VISIBILITY_KEY);
    setRevenueHidden(raw === "1");
  }, []);

  const toggleRevenueVisibility = () => {
    setRevenueHidden((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(REVENUE_VISIBILITY_KEY, next ? "1" : "0");
      }
      return next;
    });
  };

  return { revenueHidden, toggleRevenueVisibility };
}
