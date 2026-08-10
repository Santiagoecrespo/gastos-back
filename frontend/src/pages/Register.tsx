import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser, registerUser } from "../services/auth.service";
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

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) return setError("Las contraseñas no coinciden.");
    if (password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    setLoading(true);
    try {
      await registerUser(email, password, mpAlias.trim() || undefined);
      const { token, user } = await loginUser(email, password);
      login(user, token);
      navigate(searchParams.get("redirect") ?? "/dashboard");
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "No pudimos crear tu cuenta. Intenta otra vez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-sky-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8"><h1 className="text-3xl font-bold tracking-tight text-sky-950">Junta<span className="text-sky-600">Cuentas</span></h1><p className="text-slate-600 text-sm mt-2">Tu cuenta lista para la próxima juntada.</p></div>
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div><label htmlFor="reg-email" className="text-sm text-slate-700 block mb-1">Email</label><input id="reg-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input" autoComplete="email" /></div>
          <div><label htmlFor="reg-password" className="text-sm text-slate-700 block mb-1">Contraseña</label><input id="reg-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" className="input" autoComplete="new-password" /></div>
          <div><label htmlFor="reg-confirm" className="text-sm text-slate-700 block mb-1">Repetí tu contraseña</label><input id="reg-confirm" type="password" required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="La misma contraseña" className="input" autoComplete="new-password" /></div>
          <div><label htmlFor="reg-alias" className="text-sm text-slate-700 block mb-1">Alias para cobrar <span className="text-slate-400">(opcional)</span></label><input id="reg-alias" type="text" value={mpAlias} onChange={(e) => setMpAlias(e.target.value)} placeholder="ej: tu.alias" className="input" /><p className="text-xs text-slate-500 mt-1">Lo compartimos cuando alguien te tenga que transferir.</p></div>
          {error && <p className="text-accent-red text-sm bg-accent-red/10 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Creando tu cuenta..." : "Crear cuenta y armar un grupo"}</button>
        </form>
        <p className="text-center text-sm text-slate-600 mt-4">¿Ya tenés cuenta? <Link to="/login" className="text-sky-700 font-medium hover:underline">Ingresá</Link></p>
      </div>
    </div>
  );
}
