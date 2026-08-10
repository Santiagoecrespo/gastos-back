import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requestEmailCode, verifyEmailCode } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
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
      if (!codeSent) {
        await requestEmailCode(email);
        setCodeSent(true);
      } else {
        const { token, user } = await verifyEmailCode(email, code);
        login(user, token);
        navigate(searchParams.get("redirect") ?? "/dashboard");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "No se pudo procesar el acceso. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Split<span className="text-accent-green">Wise</span></h1>
          <p className="text-gray-500 text-sm mt-2">Ingresa con un codigo enviado a tu email</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="email" className="text-sm text-gray-400 block mb-1">Email</label>
            <input id="email" type="email" required value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input" autoComplete="email" />
          </div>

          {codeSent && (
            <div>
              <label htmlFor="code" className="text-sm text-gray-400 block mb-1">Codigo de 6 digitos</label>
              <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="input text-center tracking-[0.45em] text-lg" autoFocus />
            </div>
          )}

          <p className="text-xs text-gray-500">{codeSent ? `Enviamos un codigo a ${email}. Vence en 10 minutos.` : "No usamos contrasenas: recibir el codigo confirma que el email es tuyo."}</p>

          {error && <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2"><p className="text-accent-red text-sm">{error}</p></div>}

          <button type="submit" disabled={loading || (codeSent && code.length !== 6)} className="btn-primary w-full">
            {loading ? "Procesando..." : codeSent ? "Verificar e ingresar" : "Recibir codigo"}
          </button>

          {codeSent && <button type="button" onClick={() => { setCodeSent(false); setCode(""); setError(""); }} className="btn-ghost w-full text-sm">Usar otro email</button>}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">Es tu primera vez? <Link to="/register" className="text-accent-green hover:underline">Crea tu acceso</Link></p>
      </div>
    </div>
  );
}
