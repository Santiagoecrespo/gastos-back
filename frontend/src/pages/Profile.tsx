// src/pages/Profile.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";
import { updateProfile } from "../services/auth.service";

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mpAlias, setMpAlias] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      await updateProfile(mpAlias.trim() || null);
      setSuccess("¡Alias guardado!");
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-md mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/")} className="btn-ghost px-2 py-1">
            ←
          </button>
          <h1 className="text-2xl font-bold">Mi perfil</h1>
        </div>

        <div className="card space-y-5">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Email</label>
            <p className="text-gray-100">{user?.email}</p>
          </div>

          <div>
            <label htmlFor="mp-alias" className="text-sm text-gray-400 block mb-1">
              Alias de Mercado Pago
            </label>
            <input
              id="mp-alias"
              type="text"
              value={mpAlias}
              onChange={(e) => setMpAlias(e.target.value)}
              placeholder="ej: juan.garcia.mp"
              className="input"
            />
            <p className="text-xs text-gray-600 mt-1">
              Tus amigos lo van a ver para transferirte cuando les debés plata
            </p>
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
              <p className="text-accent-red text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg px-3 py-2">
              <p className="text-accent-green text-sm">{success}</p>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </main>
    </div>
  );
}
