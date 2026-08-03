// src/pages/Dashboard.tsx
import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { createGroup, getGroups, deleteGroup } from "../services/groups.service";
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
  const [participantNamesRaw, setParticipantNamesRaw] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [modalError, setModalError] = useState("");
  const [creating, setCreating] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null); // group_id to confirm

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
      const names = participantNamesRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const result = await createGroup(groupName.trim(), names);
      setInviteLink(`${window.location.origin}/g/${result.invite_token}`);
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

  const handleDelete = async (groupId: string) => {
    try {
      await deleteGroup(groupId);
      setGroups((prev) => prev.filter((g) => g.group_id !== groupId));
    } catch {
      setError("No se pudo eliminar el grupo");
    } finally {
      setConfirmDelete(null);
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
              <div key={group.group_id} className="card relative hover:border-accent-green/30 transition-all">
                {/* Delete button */}
                <div className="absolute top-3 right-3">
                  {confirmDelete === group.group_id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(group.group_id); }}
                        className="text-xs px-2 py-1 rounded bg-accent-red/20 text-accent-red hover:bg-accent-red/30 transition-colors"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(null); }}
                        className="text-xs px-2 py-1 rounded bg-dark-300 text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(group.group_id); }}
                      className="text-gray-600 hover:text-accent-red transition-colors text-lg leading-none"
                      title="Eliminar grupo"
                    >
                      ×
                    </button>
                  )}
                </div>

                <button
                  onClick={() => navigate(`/g/${group.invite_token}`)}
                  className="text-left w-full"
                >
                  <h3 className="font-semibold text-gray-100 mb-2 pr-6">{group.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span>👥</span>
                    <span>{group.participants.length} integrantes</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {group.participants.slice(0, 3).map((p) => (
                      <span key={p.id} className="badge text-xs">
                        {p.name}
                      </span>
                    ))}
                    {group.participants.length > 3 && (
                      <span className="badge text-xs">+{group.participants.length - 3}</span>
                    )}
                  </div>
                </button>
              </div>
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

                  <div>
                    <label className="text-sm text-gray-400 block mb-1">
                      Integrantes <span className="text-gray-600">(opcional, separados por coma)</span>
                    </label>
                    <input
                      type="text"
                      value={participantNamesRaw}
                      onChange={(e) => setParticipantNamesRaw(e.target.value)}
                      placeholder="Ej: Juan, María, Pedro"
                      className="input"
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
                        setGroupName("");
                        setParticipantNamesRaw("");
                        setInviteLink("");
                        setCopied(false);
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
