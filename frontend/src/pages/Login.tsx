// src/pages/Login.tsx
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await loginUser(email, password);
      login(user, token);
      navigate(searchParams.get("redirect") ?? "/");
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || "Credenciales inválidas");
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
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Split<span className="text-accent-green">Wise</span>
          </h1>
          <p className="text-gray-500 text-sm mt-2">
            Dividí gastos con tus amigos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="text-sm text-gray-400 block mb-1">
              Email
            </label>
            <input
              id="email"
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
            <label htmlFor="password" className="text-sm text-gray-400 block mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input"
              autoComplete="current-password"
            />
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
                Ingresando...
              </span>
            ) : (
              "Iniciar sesión"
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿No tenés cuenta?{" "}
          <Link to="/register" className="text-accent-green hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
