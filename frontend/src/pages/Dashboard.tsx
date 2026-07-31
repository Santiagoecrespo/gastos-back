// src/pages/Dashboard.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { createGroup, getGroups } from "../services/groups.service";
import type { GroupResponse } from "../types";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<GroupResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [modalError, setModalError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await getGroups();
      setGroups(data);
    } catch {
      setError("No se pudieron cargar los grupos");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);
    setModalError("");
    try {
      const result = await createGroup(groupName.trim());
      setInviteLink(`${window.location.origin}/join/${result.invite_token}`);
      await fetchGroups();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setModalError(axiosErr.response?.data?.detail || "Error al crear grupo");
      } else {
        setModalError("Error de conexión");
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Mis grupos</h1>
            <p className="text-gray-500 text-sm mt-1">
              Hola, {user?.email?.split("@")[0]} 👋
            </p>
          </div>
          <button onClick={() => setShowModal(true)} className="btn-primary">
            + Nuevo grupo
          </button>
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-4 py-3 mb-6">
            <p className="text-accent-red text-sm">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <svg className="animate-spin h-8 w-8 text-accent-green" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {/* Empty state */}
        {!loading && groups.length === 0 && (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">🍕</div>
            <h2 className="text-lg font-semibold text-gray-200 mb-2">
              No tenés grupos todavía
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Creá uno para empezar a dividir gastos con tus amigos
            </p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Crear mi primer grupo
            </button>
          </div>
        )}

        {/* Groups grid */}
        {!loading && groups.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <button
                key={group.group_id}
                onClick={() => navigate(`/group/${group.group_id}`)}
                className="card text-left hover:border-accent-green/30 cursor-pointer"
              >
                <h3 className="font-semibold text-gray-100 mb-2">{group.name}</h3>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>👥</span>
                  <span>{group.members.length} miembros</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {group.members.slice(0, 3).map((m) => (
                    <span key={m.id} className="badge text-xs">
                      {m.email.split("@")[0]}
                    </span>
                  ))}
                  {group.members.length > 3 && (
                    <span className="badge text-xs">
                      +{group.members.length - 3}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Modal ────────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="card w-full max-w-md">
              {inviteLink ? (
                /* ── Step 2: Invite link ── */
                <div className="space-y-4 text-center">
                  <div className="text-4xl">✅</div>
                  <h2 className="text-lg font-bold">Grupo creado</h2>
                  <p className="text-gray-400 text-sm">
                    Compartí este link con tus amigos por WhatsApp o donde quieras
                  </p>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={inviteLink}
                      className="input flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(inviteLink);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn-primary px-4 whitespace-nowrap"
                    >
                      {copied ? "¡Copiado!" : "Copiar link"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setGroupName("");
                      setInviteLink("");
                      setCopied(false);
                    }}
                    className="btn-ghost w-full"
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                /* ── Step 1: Create form ── */
                <form onSubmit={handleCreate} className="space-y-4">
                  <h2 className="text-lg font-bold">Nuevo grupo</h2>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1">
                      Nombre del grupo
                    </label>
                    <input
                      type="text"
                      required
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="Ej: Asado del domingo"
                      className="input"
                      autoFocus
                    />
                  </div>

                  {modalError && (
                    <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
                      <p className="text-accent-red text-sm">{modalError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setModalError("");
                      }}
                      className="btn-ghost flex-1"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={creating}
                      className="btn-primary flex-1"
                    >
                      {creating ? "Creando..." : "Crear grupo"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
