import { useState, useEffect, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BalanceCard from "../components/BalanceCard";
import {
  getGroupById,
  addExpense,
  getBalances,
  settleGroup,
} from "../services/groups.service";
import type { GroupResponse, BalanceResponse } from "../types";

type Tab = "expense" | "balances";

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Guest participant stored in localStorage after joining
  const storedParticipant = id
    ? JSON.parse(localStorage.getItem(`group_participant_${id}`) || "null")
    : null;
  const currentParticipantId: string = storedParticipant?.id || "";

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("expense");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Expense form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payerId, setPayerId] = useState("");
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseSuccess, setExpenseSuccess] = useState("");

  // Balances
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchGroup();
  }, [id]);

  useEffect(() => {
    if (activeTab === "balances" && id) {
      fetchBalances();
    }
  }, [activeTab, id]);

  const fetchGroup = async () => {
    try {
      const data = await getGroupById(id!);
      setGroup(data);
      if (data.participants.length > 0 && !payerId) {
        const me = data.participants.find((p) => p.id === currentParticipantId);
        setPayerId(me?.id || data.participants[0].id);
      }
    } catch {
      setError("No se pudo cargar el grupo");
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    setBalancesLoading(true);
    try {
      const data = await getBalances(id!);
      setBalanceData(data);
    } catch {
      setError("No se pudieron cargar los saldos");
    } finally {
      setBalancesLoading(false);
    }
  };

  const handleExpense = async (e: FormEvent) => {
    e.preventDefault();
    setExpenseError("");
    setExpenseSuccess("");

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setExpenseError("El monto debe ser mayor a 0");
      return;
    }

    setExpenseLoading(true);
    try {
      const result = await addExpense(id!, {
        amount: numAmount,
        description,
        date,
        payer_id: payerId,
      });
      setExpenseSuccess(
        `Gasto registrado: $${result.amount.toLocaleString("es-AR")} dividido en $${result.split_per_person.toLocaleString("es-AR")} por persona`
      );
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setExpenseError(axiosErr.response?.data?.detail || "Error al registrar gasto");
      } else {
        setExpenseError("Error de conexión");
      }
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleSettle = async () => {
    setSettleLoading(true);
    try {
      const result = await settleGroup(id!);
      await fetchBalances();
      setExpenseSuccess(
        `${result.message} (${result.expenses_settled} gastos saldados)`
      );
    } catch {
      setError("Error al saldar el grupo");
    } finally {
      setSettleLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-accent-green" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="card text-center py-12">
            <p className="text-accent-red mb-4">{error}</p>
            <button onClick={() => navigate("/")} className="btn-ghost">
              ← Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="btn-ghost px-2 py-1">
            ←
          </button>
          <div>
            <h1 className="text-2xl font-bold">{group?.name}</h1>
            <p className="text-gray-500 text-sm">
              {group?.participants.length} integrantes
              {storedParticipant && (
                <span className="ml-2 text-accent-green">• {storedParticipant.name}</span>
              )}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-50 p-1 rounded-lg mb-6 border border-dark-300">
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "expense"
                ? "bg-dark-200 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Nuevo gasto
          </button>
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === "balances"
                ? "bg-dark-200 text-gray-100 shadow-sm"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Saldos
          </button>
        </div>

        {/* ── Tab: Nuevo gasto ──────────────────────────────────── */}
        {activeTab === "expense" && (
          <form onSubmit={handleExpense} className="card space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Descripción
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej: Asado, Uber, Supermercado..."
                className="input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Monto ($)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="input"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 block mb-1">
                ¿Quién pagó?
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="input"
              >
              {group?.participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.id === currentParticipantId ? " (Yo)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {expenseError && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
                <p className="text-accent-red text-sm">{expenseError}</p>
              </div>
            )}

            {expenseSuccess && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg px-3 py-2">
                <p className="text-accent-green text-sm">{expenseSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={expenseLoading}
              className="btn-primary w-full"
            >
              {expenseLoading ? "Registrando..." : "Registrar gasto"}
            </button>
          </form>
        )}

        {/* ── Tab: Saldos ───────────────────────────────────────── */}
        {activeTab === "balances" && (
          <div className="space-y-4">
            {balancesLoading && (
              <div className="flex justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-accent-green" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}

            {!balancesLoading && balanceData?.all_settled && (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">✅</div>
                <h3 className="text-lg font-semibold text-accent-green mb-1">
                  Grupo al día
                </h3>
                <p className="text-gray-500 text-sm">
                  No hay deudas pendientes
                </p>
              </div>
            )}

            {!balancesLoading &&
              balanceData &&
              !balanceData.all_settled &&
              balanceData.balances.length > 0 && (
                <>
                  <div className="space-y-3">
                    {balanceData.balances.map((tx, i) => (
                      <BalanceCard
                        key={i}
                        transaction={tx}
                        currentParticipantId={currentParticipantId}
                      />
                    ))}
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleSettle}
                      disabled={settleLoading}
                      className="btn-danger w-full"
                    >
                      {settleLoading
                        ? "Saldando..."
                        : `Saldar todo (${balanceData.total_transactions} transferencias)`}
                    </button>
                  </div>
                </>
              )}

            {!balancesLoading &&
              balanceData &&
              !balanceData.all_settled &&
              balanceData.balances.length === 0 && (
                <div className="card text-center py-10">
                  <div className="text-4xl mb-3">📊</div>
                  <p className="text-gray-500 text-sm">
                    Todavía no hay gastos registrados
                  </p>
                </div>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
