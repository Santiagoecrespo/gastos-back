// src/pages/Register.tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { registerUser, loginUser } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mpAlias, setMpAlias] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      await registerUser(email, password, mpAlias.trim() || undefined);
      // Auto-login after registration
      const { token, user } = await loginUser(email, password);
      login(user, token);
      navigate(searchParams.get("redirect") ?? "/");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Error al registrar");
      } else {
        setError("Error de conexión. Intentá de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Split<span className="text-accent-green">Wise</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">Creá tu cuenta gratis</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="reg-email" className="text-sm text-gray-400 block mb-1">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@email.com"
              className="input"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="text-sm text-gray-400 block mb-1">
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="input"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="reg-confirm" className="text-sm text-gray-400 block mb-1">
              Confirmar contraseña
            </label>
            <input
              id="reg-confirm"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repetí tu contraseña"
              className="input"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="reg-alias" className="text-sm text-gray-400 block mb-1">
              Tu alias de Mercado Pago <span className="text-gray-600">(opcional)</span>
            </label>
            <input
              id="reg-alias"
              type="text"
              value={mpAlias}
              onChange={(e) => setMpAlias(e.target.value)}
              placeholder="ej: juan.garcia.mp"
              className="input"
            />
            <p className="text-xs text-gray-600 mt-1">
              Tus amigos lo van a ver para transferirte
            </p>
          </div>

          {error && (
            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2">
              <p className="text-accent-red text-sm">{error}</p>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
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
                Registrando...
              </span>
            ) : (
              "Crear cuenta"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" className="text-accent-green hover:underline">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
