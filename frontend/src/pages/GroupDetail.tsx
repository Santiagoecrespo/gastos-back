// src/pages/GroupDetail.tsx
import { useState, useEffect, useMemo, useRef, type FormEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import BalanceCard from "../components/BalanceCard";
import {
  getGroupById,
  addExpense,
  getBalances,
  getExpenses,
  setMyContribution,
  settleGroup,
  deleteExpense,
  updateExpenseContributions,
} from "../services/groups.service";
import type { GroupResponse, BalanceResponse, ExpenseListItem } from "../types";

type Tab = "expense" | "balances" | "history";

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const storedParticipant = id
    ? JSON.parse(localStorage.getItem(`group_participant_${id}`) || "null")
    : null;
  const currentParticipantId: string = storedParticipant?.id || "";

  const [group, setGroup] = useState<GroupResponse | null>(null);
  const [expenses, setExpenses] = useState<ExpenseListItem[]>([]);
  const [balanceData, setBalanceData] = useState<BalanceResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("expense");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isHost = group?.host_participant_id
    ? currentParticipantId === group.host_participant_id
    : !!localStorage.getItem("access_token");

  const sortedParticipants = useMemo(() => {
    if (!group) return [];
    return [...group.participants].sort((a, b) => {
      if (a.id === group.host_participant_id) return -1;
      if (b.id === group.host_participant_id) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [group]);

  // Host expense form
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [payerId, setPayerId] = useState("");
  const [hostContributions, setHostContributions] = useState<Record<string, string>>({});
  const [expenseLoading, setExpenseLoading] = useState(false);
  const [expenseError, setExpenseError] = useState("");
  const [expenseSuccess, setExpenseSuccess] = useState("");

  // Guest contribution form
  const [myContribInput, setMyContribInput] = useState("");
  const [contribLoading, setContribLoading] = useState(false);
  const [contribSuccess, setContribSuccess] = useState("");
  const [contribError, setContribError] = useState("");

  // Balances
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [settleLoading, setSettleLoading] = useState(false);

  // Keep activeTab accessible in SSE closure without stale ref
  const activeTabRef = useRef(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  // Share link
  const [shareCopied, setShareCopied] = useState(false);

  // Delete expense confirmation
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState<string | null>(null);
  const [editingContributionsFor, setEditingContributionsFor] = useState<string | null>(null);
  const [editedContributions, setEditedContributions] = useState<Record<string, string>>({});
  const [savingContributions, setSavingContributions] = useState(false);
  const [contributionEditError, setContributionEditError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchGroup();
  }, [id]);

  useEffect(() => {
    if (activeTab === "balances" && id) fetchBalances();
  }, [activeTab, id]);

  // SSE real-time: re-fetch silently whenever the server broadcasts a change
  useEffect(() => {
    if (!id) return;
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";
    const token =
      localStorage.getItem(`group_token_${id}`) ||
      localStorage.getItem("access_token") ||
      "";
    const es = new EventSource(
      `${apiUrl}/api/groups/${id}/events?token=${encodeURIComponent(token)}`
    );
    es.onmessage = (e) => {
      if (e.data !== "refresh") return;
      getGroupById(id).then(setGroup).catch(() => {});
      getExpenses(id).then(setExpenses).catch(() => {});
      if (activeTabRef.current === "balances") {
        getBalances(id).then(setBalanceData).catch(() => {});
      }
    };
    es.onerror = () => {}; // browser auto-reconnects; suppress console noise
    return () => es.close();
  }, [id]);

  const fetchGroup = async () => {
    try {
      const [groupData, expData] = await Promise.all([
        getGroupById(id!),
        getExpenses(id!).catch(() => [] as ExpenseListItem[]),
      ]);
      setGroup(groupData);
      setExpenses(expData);
      if (groupData.participants.length > 0) {
        const hostId = groupData.host_participant_id;
        setPayerId(hostId || groupData.participants[0].id);
        // Pre-fill host contributions from pending_contribution
        const initContribs: Record<string, string> = {};
        groupData.participants.forEach((p) => {
          if (p.pending_contribution > 0) initContribs[p.id] = String(p.pending_contribution);
        });
        setHostContributions(initContribs);
        const myP = groupData.participants.find((p) => p.id === currentParticipantId);
        if (myP && myP.pending_contribution > 0) {
          setMyContribInput(String(myP.pending_contribution));
        }
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
      setBalanceData(await getBalances(id!));
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
        contributions: Object.entries(hostContributions)
          .map(([participant_id, val]) => ({ participant_id, amount: parseFloat(val) || 0 }))
          .filter((c) => c.amount > 0),
      });
      setExpenseSuccess(
        `Gasto registrado: $${result.amount.toLocaleString("es-AR")} — $${result.split_per_person.toLocaleString("es-AR")} por persona`
      );
      setDescription("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setHostContributions({});
      const [refreshed, refreshedExp] = await Promise.all([
        getGroupById(id!),
        getExpenses(id!).catch(() => [] as ExpenseListItem[]),
      ]);
      setGroup(refreshed);
      setExpenses(refreshedExp);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setExpenseError(axErr.response?.data?.detail || "Error al registrar gasto");
    } finally {
      setExpenseLoading(false);
    }
  };

  const handleContribution = async (e: FormEvent) => {
    e.preventDefault();
    setContribError("");
    setContribSuccess("");
    const amt = parseFloat(myContribInput) || 0;
    setContribLoading(true);
    try {
      await setMyContribution(id!, amt);
      setContribSuccess(
        amt > 0
          ? `Aporte de $${amt.toLocaleString("es-AR")} guardado. El anfitrion lo vera al registrar el gasto.`
          : "Aporte eliminado."
      );
      setGroup(await getGroupById(id!));
    } catch {
      setContribError("Error al guardar el aporte");
    } finally {
      setContribLoading(false);
    }
  };

  const handleSettle = async () => {
    setSettleLoading(true);
    try {
      const result = await settleGroup(id!);
      await fetchBalances();
      setExpenseSuccess(`${result.message} (${result.expenses_settled} gastos saldados)`);
    } catch {
      setError("Error al saldar el grupo");
    } finally {
      setSettleLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await deleteExpense(id!, expenseId);
      setExpenses((prev) => prev.filter((e) => e.expense_id !== expenseId));
    } catch {
      setExpenseError("No se pudo eliminar el gasto");
    } finally {
      setConfirmDeleteExpense(null);
    }
  };

  const startEditingContributions = (expense: ExpenseListItem) => {
    setContributionEditError("");
    setEditedContributions(
      Object.fromEntries(expense.shares.map((share) => [share.participant_id, share.contribution ? String(share.contribution) : ""]))
    );
    setEditingContributionsFor(expense.expense_id);
  };

  const saveExpenseContributions = async (expense: ExpenseListItem) => {
    setContributionEditError("");
    setSavingContributions(true);
    try {
      await updateExpenseContributions(
        id!,
        expense.expense_id,
        expense.shares.map((share) => ({
          participant_id: share.participant_id,
          amount: parseFloat(editedContributions[share.participant_id]) || 0,
        }))
      );
      setExpenses(await getExpenses(id!));
      if (activeTab === "balances") await fetchBalances();
      setEditingContributionsFor(null);
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string } } };
      setContributionEditError(axErr.response?.data?.detail || "No se pudieron guardar los aportes");
    } finally {
      setSavingContributions(false);
    }
  };

  const handleShare = async () => {
    if (!group) return;
    const link = `${window.location.origin}/g/${group.invite_token}`;
    await navigator.clipboard.writeText(link);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2500);
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
            <button onClick={() => navigate("/dashboard")} className="btn-ghost">
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const hostParticipant = group?.participants.find((p) => p.id === group.host_participant_id);
  const lastExpense = expenses[0] ?? null;

  const handleChangeParticipant = () => {
    if (!id) return;
    const inviteToken = localStorage.getItem(`group_invite_token_${id}`) || group?.invite_token;
    localStorage.removeItem(`group_token_${id}`);
    localStorage.removeItem(`group_participant_${id}`);
    if (inviteToken) {
      navigate(`/g/${inviteToken}`, { replace: true });
      return;
    }
    setError("No encontramos el link de invitación para elegir otro integrante.");
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/dashboard")} className="btn-ghost px-2 py-1">
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">{group?.name}</h1>
            <p className="text-gray-500 text-sm">
              {group?.participants.length} integrantes
              {storedParticipant && (
                <span className="ml-2">
                  <span className="text-accent-green">
                    {storedParticipant.name}
                    {isHost && <span className="ml-1">Anfitrion</span>}
                  </span>
                  {!isHost && (
                    <button onClick={handleChangeParticipant} className="ml-2 text-xs text-yellow-500 hover:text-yellow-400 underline">
                      No soy yo
                    </button>
                  )}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={handleShare}
            className="btn-ghost text-sm px-3 py-2 whitespace-nowrap"
            title="Copiar link de invitacion"
          >
            {shareCopied ? "Copiado!" : "Compartir"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-dark-50 p-1 rounded-lg mb-6 border border-dark-300">
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "expense" ? "bg-dark-200 text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {isHost ? "Nuevo gasto" : "Mi aporte"}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "history" ? "bg-dark-200 text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Gastos
            {expenses.length > 0 && (
              <span className="ml-1 text-xs text-gray-500">({expenses.length})</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("balances")}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === "balances" ? "bg-dark-200 text-gray-100 shadow-sm" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            Saldos
          </button>
        </div>

        {/* Tab: Expense / Aporte */}
        {activeTab === "expense" && isHost && (
          <form onSubmit={handleExpense} className="card space-y-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Descripcion</label>
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
                <label className="text-sm text-gray-400 block mb-1">Monto ($)</label>
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
                <label className="text-sm text-gray-400 block mb-1">Fecha</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            {/* Preview en tiempo real */}
            {parseFloat(amount) > 0 && sortedParticipants.length > 0 && (
              <div className="bg-dark-50 border border-dark-300 rounded-lg p-3 space-y-1">
                <p className="text-sm text-gray-400 mb-2">Division estimada:</p>
                {sortedParticipants.map((p) => {
                  const total = parseFloat(amount) || 0;
                  const splitBase = total / sortedParticipants.length;
                  const pending = splitBase - p.pending_contribution;
                  const isThisHost = p.id === group?.host_participant_id;
                  return (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span className={isThisHost ? "text-yellow-400" : "text-gray-300"}>
                        {p.name}{isThisHost ? " (Anfitrion)" : ""}
                      </span>
                      {pending <= 0 ? (
                        <span className="text-accent-green">Ya cubierto</span>
                      ) : (
                        <span>
                          <span className="text-gray-100">${Math.round(pending).toLocaleString("es-AR")}</span>
                          {p.pending_contribution > 0 && (
                            <span className="text-gray-500 text-xs"> (aporto ${Math.round(p.pending_contribution).toLocaleString("es-AR")})</span>
                          )}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400 block mb-1">Quien pago?</label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="input"
              >
                {sortedParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.id === group?.host_participant_id ? " (Anfitrion)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Aportes previos - solo lectura */}
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Aportes previos <span className="text-gray-600">(ingresados por cada uno)</span>
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Se descuentan automaticamente de la deuda de cada integrante.
              </p>
              <div className="space-y-2">
                {sortedParticipants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-sm flex-1 text-gray-400">
                      {p.name}
                      {p.id === group?.host_participant_id && <span className="ml-1 text-yellow-400 text-xs"> (Anfitrion)</span>}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={hostContributions[p.id] ?? ""}
                      onChange={(e) =>
                        setHostContributions((prev) => ({ ...prev, [p.id]: e.target.value }))
                      }
                      placeholder="Sin aporte"
                      className="input w-32 text-sm"
                    />
                  </div>
                ))}
              </div>
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

            <button type="submit" disabled={expenseLoading} className="btn-primary w-full">
              {expenseLoading ? "Registrando..." : "Registrar gasto"}
            </button>
          </form>
        )}

        {activeTab === "expense" && !isHost && (
          <div className="space-y-4">
            <div className="card border border-yellow-500/20 bg-yellow-500/5">
              <p className="text-sm text-yellow-300 font-medium mb-1">
                Solo el anfitrion puede registrar gastos
              </p>
              {hostParticipant && (
                <p className="text-xs text-gray-400">
                  Anfitrion: <span className="text-gray-200">{hostParticipant.name}</span>
                </p>
              )}
            </div>

            {lastExpense ? (
              <div className="card space-y-2">
                <p className="text-xs text-gray-500">Ultimo gasto registrado:</p>
                <p className="text-gray-100 font-medium">
                  {lastExpense.description}
                  <span className="text-accent-green ml-2">${lastExpense.amount.toLocaleString("es-AR")}</span>
                </p>
                <p className="text-xs text-gray-500">
                  Pago: {lastExpense.payer_name} &middot; {lastExpense.date}
                </p>
                {sortedParticipants.length > 0 && (
                  <p className="text-sm text-gray-300 pt-1">
                    Tu parte estimada:{" "}
                    <span className="text-accent-green font-medium">
                      ${Math.round(lastExpense.amount / sortedParticipants.length).toLocaleString("es-AR")}
                    </span>
                  </p>
                )}
              </div>
            ) : (
              <div className="card text-center py-6">
                <p className="text-gray-500 text-sm">El anfitrion todavia no registro ningun gasto.</p>
              </div>
            )}

            <form onSubmit={handleContribution} className="card space-y-3">
              <label className="text-sm text-gray-300 block font-medium">
                Aportaste algo antes?
              </label>
              <p className="text-xs text-gray-500">
                Si trajiste algo o pagaste por adelantado, ingresa el monto. Se descuenta de tu deuda.
              </p>
              <input
                type="number"
                min="0"
                step="0.01"
                value={myContribInput}
                onChange={(e) => setMyContribInput(e.target.value)}
                placeholder="ej: 2000"
                className="input"
              />
              {contribError && <p className="text-accent-red text-sm">{contribError}</p>}
              {contribSuccess && (
                <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg px-3 py-2">
                  <p className="text-accent-green text-sm">{contribSuccess}</p>
                </div>
              )}
              <button type="submit" disabled={contribLoading} className="btn-primary w-full">
                {contribLoading ? "Guardando..." : "Guardar mi aporte"}
              </button>
            </form>
          </div>
        )}

        {/* Tab: Historial de gastos */}
        {activeTab === "history" && (
          <div className="space-y-3">
            {expenses.length === 0 ? (
              <div className="card text-center py-10">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-gray-500 text-sm">No hay gastos registrados aún</p>
              </div>
            ) : (
              expenses.map((exp) => {
                const splitPP = sortedParticipants.length > 0
                  ? Math.round(exp.amount / sortedParticipants.length)
                  : 0;
                return (
                  <div key={exp.expense_id} className="card space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-100 truncate">{exp.description}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Pagó: {exp.payer_name} · {exp.date}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-accent-green font-semibold">
                          ${exp.amount.toLocaleString("es-AR")}
                        </p>
                        <p className="text-xs text-gray-500">
                          ${splitPP.toLocaleString("es-AR")} c/u
                        </p>
                      </div>
                    </div>
                    {exp.shares.some((share) => share.contribution > 0) && (
                      <p className="text-xs text-accent-green">
                        Aportes cargados: {exp.shares
                          .filter((share) => share.contribution > 0)
                          .map((share) => {
                            const person = sortedParticipants.find((p) => p.id === share.participant_id);
                            return `${person?.name || "Integrante"} $${share.contribution.toLocaleString("es-AR")}`;
                          })
                          .join(" · ")}
                      </p>
                    )}
                    {isHost && (
                      <div className="pt-1 space-y-3">
                        {editingContributionsFor === exp.expense_id ? (
                          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 space-y-3">
                            <div>
                              <p className="text-sm text-yellow-400 font-medium">Corregir aportes</p>
                              <p className="text-xs text-gray-500 mt-1">Anotá lo que cada persona ya puso para este gasto. Se descuenta de lo que le falta pagar.</p>
                            </div>
                            {sortedParticipants.map((person) => {
                              const share = exp.shares.find((item) => item.participant_id === person.id);
                              if (!share) return null;
                              return (
                                <div key={person.id} className="flex items-center gap-2">
                                  <span className="text-sm text-gray-300 flex-1">{person.name}</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={share.amount_owed}
                                    step="0.01"
                                    value={editedContributions[person.id] ?? ""}
                                    onChange={(event) => setEditedContributions((previous) => ({ ...previous, [person.id]: event.target.value }))}
                                    placeholder="0"
                                    className="input w-28 text-sm"
                                  />
                                </div>
                              );
                            })}
                            {contributionEditError && <p className="text-xs text-accent-red">{contributionEditError}</p>}
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setEditingContributionsFor(null)} className="btn-ghost text-xs px-3 py-2">Cancelar</button>
                              <button onClick={() => void saveExpenseContributions(exp)} disabled={savingContributions} className="btn-primary text-xs px-3 py-2">
                                {savingContributions ? "Guardando..." : "Guardar aportes"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-end">
                            <button onClick={() => startEditingContributions(exp)} className="text-xs text-yellow-500 hover:text-yellow-400 transition-colors">
                              Corregir aportes
                            </button>
                          </div>
                        )}
                        <div className="flex justify-end">
                        {confirmDeleteExpense === exp.expense_id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteExpense(exp.expense_id)}
                              className="text-xs px-2 py-1 rounded bg-accent-red/20 text-accent-red hover:bg-accent-red/30 transition-colors"
                            >
                              Eliminar
                            </button>
                            <button
                              onClick={() => setConfirmDeleteExpense(null)}
                              className="text-xs px-2 py-1 rounded bg-dark-300 text-gray-400 hover:text-gray-200 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteExpense(exp.expense_id)}
                            className="text-xs text-gray-600 hover:text-accent-red transition-colors"
                          >
                            Eliminar
                          </button>
                        )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab: Saldos */}
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
                <div className="text-4xl mb-3">check</div>
                <h3 className="text-lg font-semibold text-accent-green mb-1">Grupo al dia</h3>
                <p className="text-gray-500 text-sm">No hay deudas pendientes</p>
              </div>
            )}

            {!balancesLoading && balanceData && !balanceData.all_settled && (() => {
              const visibleBalances = isHost
                ? balanceData.balances
                : balanceData.balances.filter((tx) => tx.from_participant.id === currentParticipantId);

              if (balanceData.balances.length === 0) {
                return (
                  <div className="card text-center py-10">
                    <p className="text-gray-500 text-sm">Todavia no hay gastos registrados</p>
                  </div>
                );
              }

              if (visibleBalances.length === 0) {
                return (
                  <div className="card text-center py-10">
                    <p className="text-accent-green text-sm">No tenes deuda pendiente</p>
                  </div>
                );
              }

              return (
                <>
                  {!isHost && hostParticipant && (
                    hostParticipant.mp_alias ? (
                      <div className="card border border-accent-green/30 bg-accent-green/5 space-y-1">
                        <p className="text-sm text-gray-300 font-medium">
                          Transferile a {hostParticipant.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Alias: <span className="text-gray-100 font-medium">{hostParticipant.mp_alias}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-3">
                        <p className="text-sm text-yellow-400">
                          El anfitrion no cargo su alias de pago. Pidele para poder transferirle.
                        </p>
                      </div>
                    )
                  )}

                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 px-1">{balanceData.inflation_note}</p>
                    {visibleBalances.map((tx, i) => (
                      <BalanceCard
                        key={i}
                        transaction={tx}
                        currentParticipantId={currentParticipantId}
                        inflationNote={balanceData.inflation_note}
                      />
                    ))}
                  </div>

                  {isHost && (
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
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
