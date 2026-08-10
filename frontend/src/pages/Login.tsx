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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { token, user } = await loginUser(email, password);
      login(user, token);
      navigate(searchParams.get("redirect") ?? "/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "No pudimos ingresar. Revisa tus datos e intenta otra vez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-sky-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-sky-950">Junta<span className="text-sky-600">Cuentas</span></h1>
          <p className="text-slate-600 text-sm mt-2">Entra y armá tu próxima juntada.</p>
        </div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div><label htmlFor="email" className="text-sm text-slate-700 block mb-1">Email</label><input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input" autoComplete="email" /></div>
          <div><label htmlFor="password" className="text-sm text-slate-700 block mb-1">Contraseña</label><input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tu contraseña" className="input" autoComplete="current-password" /></div>
          {error && <p className="text-accent-red text-sm bg-accent-red/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Entrando..." : "Ingresar"}</button>
        </form>
        <p className="text-center text-sm text-slate-600 mt-4">¿Todavía no tenés cuenta? <Link to="/register" className="text-sky-700 font-medium hover:underline">Creala en un minuto</Link></p>
      </div>
    </div>
  );
}
