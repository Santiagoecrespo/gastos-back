import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { requestEmailCode, verifyEmailCode } from "../services/auth.service";
import { useAuth } from "../hooks/useAuth";

export default function Register() {
  const [email, setEmail] = useState("");
  const [mpAlias, setMpAlias] = useState("");
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
        await requestEmailCode(email, mpAlias);
        setCodeSent(true);
      } else {
        const { token, user } = await verifyEmailCode(email, code);
        login(user, token);
        navigate(searchParams.get("redirect") ?? "/dashboard");
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || "No se pudo crear el acceso. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Split<span className="text-accent-green">Wise</span></h1>
          <p className="text-gray-500 text-sm mt-2">Crea tu acceso gratis con un email real</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label htmlFor="reg-email" className="text-sm text-gray-400 block mb-1">Email</label>
            <input id="reg-email" type="email" required value={email} disabled={codeSent} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="input" autoComplete="email" />
          </div>

          {!codeSent && <div>
            <label htmlFor="reg-alias" className="text-sm text-gray-400 block mb-1">Alias para cobrar <span className="text-gray-600">(opcional)</span></label>
            <input id="reg-alias" type="text" value={mpAlias} onChange={(e) => setMpAlias(e.target.value)} placeholder="ej: juan.garcia.mp" className="input" />
            <p className="text-xs text-gray-600 mt-1">Tus amigos podran copiarlo y abrir su app de pagos.</p>
          </div>}

          {codeSent && <div>
            <label htmlFor="reg-code" className="text-sm text-gray-400 block mb-1">Codigo de 6 digitos</label>
            <input id="reg-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="input text-center tracking-[0.45em] text-lg" autoFocus />
          </div>}

          <p className="text-xs text-gray-500">{codeSent ? `Enviamos un codigo a ${email}. Vence en 10 minutos.` : "Al recibir el codigo confirmas que este email es tuyo; no hace falta una contrasena."}</p>
          {error && <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg px-3 py-2"><p className="text-accent-red text-sm">{error}</p></div>}
          <button type="submit" disabled={loading || (codeSent && code.length !== 6)} className="btn-primary w-full">{loading ? "Procesando..." : codeSent ? "Verificar y continuar" : "Recibir codigo"}</button>
          {codeSent && <button type="button" onClick={() => { setCodeSent(false); setCode(""); setError(""); }} className="btn-ghost w-full text-sm">Corregir email o alias</button>}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">Ya tienes acceso? <Link to="/login" className="text-accent-green hover:underline">Ingresa</Link></p>
      </div>
    </div>
  );
}
