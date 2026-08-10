import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setMessage("Listo, el link quedó copiado. Guardalo en favoritos o mandátelo por WhatsApp para volver rápido.");
    } catch {
      setMessage("Guardá este link en favoritos para volver rápido cuando armes otra juntada.");
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-sky-50 text-slate-900">
      <section className="max-w-5xl mx-auto px-5 py-6 sm:py-10">
        <nav className="flex items-center justify-between gap-4">
          <span className="text-xl font-bold tracking-tight text-sky-950">Junta<span className="text-sky-600">Cuentas</span></span>
          {isAuthenticated ? <button onClick={() => navigate("/dashboard")} className="btn-primary text-sm">Mis grupos</button> : <Link to="/login" className="btn-ghost text-sm">Ingresar</Link>}
        </nav>
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pt-14 sm:pt-20 pb-16">
          <div>
            <p className="inline-flex badge border-sky-200 text-sky-700 mb-5">Para asados, viajes y planes entre amigos</p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight text-sky-950">La cuenta de la juntada, <span className="text-sky-600">resuelta.</span></h1>
            <p className="text-slate-600 text-lg leading-relaxed mt-5 max-w-xl">Creás el grupo, pasás un link y después cada uno ve cuánto le toca. Sin descargar nada y sin vueltas.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8"><Link to="/register" className="btn-primary text-center">Armar una juntada</Link><button onClick={copyLink} className="btn-ghost border border-sky-200">Copiar link de JuntaCuentas</button></div>
            {message && <p className="text-sm text-sky-700 mt-4" role="status">{message}</p>}
            <p className="text-xs text-slate-500 mt-5">Es una web: entrás desde el link, tanto en el celu como en la compu.</p>
          </div>
          <div className="relative"><div className="absolute -inset-8 bg-sky-200/60 blur-3xl rounded-full" /><div className="card relative space-y-4 shadow-xl shadow-sky-200/50"><div className="flex justify-between items-center"><div><p className="text-xs text-slate-500">Asado del sábado</p><p className="font-semibold mt-1 text-slate-900">Solo falta saldar</p></div><span className="badge text-sky-700">Todo claro</span></div><div className="rounded-lg bg-sky-50 border border-sky-100 p-4 flex justify-between items-center"><div><p className="text-sm text-slate-800">Le debés a Sofía</p><p className="text-xs text-slate-500 mt-1">Alias listo para copiar</p></div><span className="font-bold text-accent-red">$ 8.500</span></div><button className="btn-primary w-full" type="button" onClick={copyLink}>Copiar alias y pagar</button><p className="text-center text-xs text-slate-500">Abrís Mercado Pago, Ualá, Naranja X o la billetera que uses.</p></div></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm text-slate-600"><div className="card py-5"><strong className="block text-sky-950 mb-1">Armá el plan</strong>Creá el grupo con el nombre de la juntada. Después podés sumar a quien quieras.</div><div className="card py-5"><strong className="block text-sky-950 mb-1">Pasá el link</strong>Tus amigos entran directo, eligen su nombre y no tienen que crear una cuenta.</div><div className="card py-5"><strong className="block text-sky-950 mb-1">Cierren la cuenta</strong>Cuando termina el plan, cada uno copia el alias y paga desde su billetera.</div></div>
      </section>
    </main>
  );
}
