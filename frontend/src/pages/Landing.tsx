import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const install = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const result = await installPrompt.userChoice;
      setMessage(result.outcome === "accepted" ? "Listo: ya podes abrir SplitWise como una app." : "Podes instalarla cuando quieras desde el menu del navegador.");
      setInstallPrompt(null);
      return;
    }

    try {
      await navigator.clipboard.writeText(window.location.origin);
      setMessage("Link copiado. En iPhone usa Compartir > Agregar a inicio; en Chrome usa el menu > Instalar app.");
    } catch {
      setMessage("Guarda esta pagina en favoritos o usa el menu del navegador para instalar la app.");
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-dark">
      <section className="max-w-5xl mx-auto px-5 py-6 sm:py-10">
        <nav className="flex items-center justify-between gap-4">
          <span className="text-xl font-bold tracking-tight">Split<span className="text-accent-green">Wise</span></span>
          {isAuthenticated ? <button onClick={() => navigate("/dashboard")} className="btn-primary text-sm">Mis grupos</button> : <Link to="/login" className="btn-ghost text-sm">Ingresar</Link>}
        </nav>

        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center pt-14 sm:pt-20 pb-16">
          <div>
            <p className="inline-flex badge border-accent-green/30 text-accent-green mb-5">Simple para grupos, asados y viajes</p>
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">Dividan gastos. <span className="text-accent-green">Sin vueltas.</span></h1>
            <p className="text-gray-400 text-lg leading-relaxed mt-5 max-w-xl">Crea un grupo, comparte un link y deja que SplitWise calcule quién le transfiere a quién. Funciona desde cualquier celular o computadora.</p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link to="/register" className="btn-primary text-center">Crear mi primer grupo</Link>
              <button onClick={install} className="btn-ghost border border-dark-300">Guardar / instalar app</button>
            </div>
            {message && <p className="text-sm text-accent-green mt-4" role="status">{message}</p>}
            <p className="text-xs text-gray-600 mt-5">Acceso seguro con codigo por email. Sin contrasenas para recordar.</p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 bg-accent-green/10 blur-3xl rounded-full" />
            <div className="card relative space-y-4 shadow-2xl shadow-black/40">
              <div className="flex justify-between items-center"><div><p className="text-xs text-gray-500">Asado del sabado</p><p className="font-semibold mt-1">3 transferencias pendientes</p></div><span className="badge text-accent-green">Al dia</span></div>
              <div className="rounded-lg bg-dark-100 border border-dark-300 p-4 flex justify-between items-center"><div><p className="text-sm text-gray-300">Le debes a Sofia</p><p className="text-xs text-gray-500 mt-1">Alias listo para copiar</p></div><span className="font-bold text-accent-red">$ 8.500</span></div>
              <button className="btn-primary w-full" type="button" onClick={install}>Pagar desde mi app</button>
              <p className="text-center text-xs text-gray-500">Mercado Pago, Uala, Naranja X y mas</p>
            </div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-400">
          <div className="card py-4"><strong className="block text-gray-100 mb-1">1. Comparte</strong>Un solo link para todos.</div>
          <div className="card py-4"><strong className="block text-gray-100 mb-1">2. Registra</strong>Gastos y aportes en tiempo real.</div>
          <div className="card py-4"><strong className="block text-gray-100 mb-1">3. Cobra</strong>Copia el alias y abre tu billetera.</div>
        </div>
      </section>
    </main>
  );
}
