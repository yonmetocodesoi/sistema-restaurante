import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { db, auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, signOut, type User } from "firebase/auth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { formatBRL } from "@/data/menu";
import { useRevenueVisibility } from "@/lib/access";
import { 
  ShoppingBag, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  LogIn,
  LogOut,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Painel Admin — Espetinho do João" },
      { name: "description", content: "Gerenciamento de pedidos e faturamento." },
    ],
  }),
});

const ADMIN_EMAIL = "yurealves641@gmail.com";

type Order = {
  id: string;
  customer: {
    name: string;
    address: string;
    payment: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: "pending" | "paid";
  createdAt: string;
};

type Comanda = {
  id: string;
  mesa: number;
  status: "preparo" | "pronto" | "entregue";
  total: number;
};

type DailySummary = {
  date: string;
  revenue: number;
  closedTables: number;
};

type Sale = {
  id: string;
  total: number;
  createdAt: string;
};

function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { revenueHidden, toggleRevenueVisibility } = useRevenueVisibility();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qOrders = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const qComandas = query(collection(db, "comandas"), orderBy("createdAt", "desc"));
      const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
      const hoje = new Date().toISOString().slice(0, 10);

      const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);
        setLoading(false);
        setError(null);
      }, (err) => {
        console.error("Firestore error:", err);
        setError(err.message);
        setLoading(false);
      });

      const unsubscribeComandas = onSnapshot(qComandas, (snapshot) => {
        const comandasData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comanda[];
        setComandas(comandasData);
      });

      const unsubscribeSales = onSnapshot(qSales, (snapshot) => {
        const salesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Sale[];
        setSales(salesData);
      });

      const unsubscribeSummary = onSnapshot(doc(db, "daily_summaries", hoje), (snapshot) => {
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

      return () => {
        unsubscribeOrders();
        unsubscribeComandas();
        unsubscribeSummary();
        unsubscribeSales();
      };
    } catch (err: any) {
      console.error("Initialization error:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      alert("Erro ao fazer login: " + err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  const toggleStatus = async (orderId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "pending" ? "paid" : "pending";
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus
      });
    } catch (err: any) {
      alert("Erro ao atualizar status: " + err.message);
    }
  };

  const stats = {
    totalOrders: orders.length,
    totalRevenue:
      dailySummary?.revenue ??
      sales
        .filter((sale) => sale.createdAt?.slice(0, 10) === new Date().toISOString().slice(0, 10))
        .reduce((acc, sale) => acc + (sale.total ?? 0), 0),
    pendingOrders: orders.filter(o => o.status === "pending").length,
    mesasEmUso: new Set(comandas.filter((c) => c.status !== "entregue").map((c) => c.mesa)).size,
  };

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Login Screen
  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-6 text-white">
        <div className="max-w-md w-full bg-card rounded-3xl p-8 ring-1 ring-white/10 text-center shadow-2xl">
          <div className="h-20 w-20 bg-primary/20 text-primary rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-2xl font-black mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-8">Este painel é exclusivo para o administrador. Por favor, entre com sua conta Google autorizada.</p>
          
          {user && user.email !== ADMIN_EMAIL && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
              O email <strong>{user.email}</strong> não tem permissão de acesso.
            </div>
          )}

          <button 
            onClick={user ? handleLogout : handleLogin}
            className="w-full py-4 bg-primary text-primary-foreground font-bold rounded-xl hover:scale-[1.02] flex items-center justify-center gap-2 transition-all"
          >
            {user ? <LogOut size={20} /> : <LogIn size={20} />}
            {user ? "Sair e Trocar Conta" : "Entrar com Google"}
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] p-6 text-white text-center">
        <div className="max-w-md w-full bg-card rounded-3xl p-8 ring-1 ring-white/10">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Erro de Firestore</h2>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-xl"
          >
            Recarregar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-foreground p-4 md:p-8">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Painel Administrativo</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Controlado por <span className="text-primary font-medium">{user.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleRevenueVisibility}
            className="rounded-xl bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white"
          >
            <span className="inline-flex items-center gap-2">
              {revenueHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              {revenueHidden ? "Mostrar faturamento" : "Ocultar faturamento"}
            </span>
          </button>
          <Link
            to="/garcom"
            className="rounded-xl bg-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary"
          >
            Garcom
          </Link>
          <Link
            to="/churrasqueiro"
            className="rounded-xl bg-orange-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-orange-400"
          >
            Churrasqueiro
          </Link>
          <Link
            to="/caixa"
            className="rounded-xl bg-green-500/20 px-4 py-2 text-xs font-bold uppercase tracking-wider text-green-400"
          >
            Caixa
          </Link>
           <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all"
          >
            <LogOut size={16} />
            Sair
          </button>
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-card p-2 ring-1 ring-white/10">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-[10px] font-medium text-white">Live</span>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 p-6 ring-1 ring-primary/20">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-primary/20 p-2 text-primary">
              <DollarSign size={24} />
            </div>
            <TrendingUp size={20} className="text-green-500" />
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Faturamento (Pago)</p>
          <h2 className="text-3xl font-black text-white mt-1">
            {revenueHidden ? "R$ ••••" : formatBRL(stats.totalRevenue)}
          </h2>
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-blue-500/20 p-2 text-blue-500">
              <ShoppingBag size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total de Pedidos</p>
          <h2 className="text-3xl font-black text-white mt-1">{stats.totalOrders}</h2>
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-orange-500/20 p-2 text-orange-500">
              <Clock size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pedidos Pendentes</p>
          <h2 className="text-3xl font-black text-white mt-1">{stats.pendingOrders}</h2>
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <ShieldCheck size={24} />
            </div>
          </div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Mesas em uso (ao vivo)</p>
          <h2 className="text-3xl font-black text-white mt-1">{stats.mesasEmUso}</h2>
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-3xl bg-card/50 ring-1 ring-white/10 overflow-hidden">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between bg-card">
          <h3 className="font-bold text-white">Pedidos Recentes</h3>
        </div>
        
        <div className="divide-y divide-white/5">
          {orders.length === 0 ? (
            <div className="p-20 text-center text-muted-foreground">
              Nenhum pedido realizado ainda.
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-6 transition-colors hover:bg-white/5">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xs font-mono text-muted-foreground">ID: {order.id.slice(0, 8)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                        order.status === "paid" 
                        ? "bg-green-500/10 text-green-500 ring-1 ring-green-500/20" 
                        : "bg-orange-500/10 text-orange-500 ring-1 ring-orange-500/20"
                      }`}>
                        {order.status === "paid" ? "Pago" : "Pendente"}
                      </span>
                    </div>
                    <h4 className="text-lg font-bold text-white mb-1">{order.customer.name}</h4>
                    <p className="text-sm text-muted-foreground mb-4">{order.customer.address}</p>
                    
                    {order.customer.payment === "Dinheiro" && order.customer.changeFor && (
                      <div className="mb-4 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold inline-block">
                        💵 Precisa de troco para {formatBRL(Number(order.customer.changeFor))}
                      </div>
                    )}
                    
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <span className="text-primary font-bold">{item.quantity}x</span>
                          <span className="text-gray-300">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-4 min-w-[200px]">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Pago via {order.customer.payment}</p>
                      <p className="text-2xl font-black text-white">{formatBRL(order.total)}</p>
                    </div>

                    <button
                      onClick={() => toggleStatus(order.id, order.status)}
                      className={`flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all ${
                        order.status === "paid"
                        ? "bg-white/5 text-white hover:bg-white/10"
                        : "bg-primary text-primary-foreground shadow-glow hover:scale-[1.02]"
                      }`}
                    >
                      {order.status === "paid" ? (
                        <>
                          <Clock size={16} />
                          Marcar Pendente
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          Confirmar Pagamento
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
