import { useCallback, useEffect, useState } from "react";

interface Props {
  alias: string;
  amount: number;
  recipientName: string;
  open: boolean;
  onClose: () => void;
}

interface Platform {
  name: string;
  packageName?: string;
  appLinkHost?: string;
  tone: string;
}

const PLATFORMS: Platform[] = [
  { name: "Mercado Pago", packageName: "com.mercadopago.wallet", appLinkHost: "www.mercadopago.com.ar", tone: "border-blue-500/30 hover:bg-blue-500/10" },
  { name: "Ualá", packageName: "ar.com.bancar.uala", appLinkHost: "www.uala.com.ar", tone: "border-purple-500/30 hover:bg-purple-500/10" },
  { name: "Naranja X", packageName: "com.tarjetanaranja.ncuenta", appLinkHost: "www.naranjax.com", tone: "border-orange-500/30 hover:bg-orange-500/10" },
  { name: "MODO", packageName: "com.playdigital.modo", appLinkHost: "www.modo.com.ar", tone: "border-sky-500/30 hover:bg-sky-500/10" },
  { name: "Prex", packageName: "air.Prex", appLinkHost: "www.prexcard.com", tone: "border-green-500/30 hover:bg-green-500/10" },
  { name: "Solo copiar", tone: "border-dark-300 hover:bg-dark-200" },
];

function androidLaunchIntent(packageName: string, appLinkHost: string) {
  // Android Chrome accepts only browser-safe activities. This uses each wallet's
  // official app-link domain and deliberately has no browser fallback.
  return `intent://${appLinkHost}/#Intent;scheme=https;package=${packageName};end`;
}

export default function PaymentSheet({ alias, amount, recipientName, open, onClose }: Props) {
  const [toast, setToast] = useState("");
  const [animating, setAnimating] = useState(false);
  const formattedAmount = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  useEffect(() => {
    if (open) requestAnimationFrame(() => setAnimating(true));
    else setAnimating(false);
  }, [open]);

  const close = useCallback(() => {
    setAnimating(false);
    setTimeout(onClose, 250);
  }, [onClose]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => event.key === "Escape" && close();
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [close, open]);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 3200);
  };

  const copyAlias = async () => {
    try {
      await navigator.clipboard.writeText(alias);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = alias;
      textarea.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  };

  const openPlatform = async (platform: Platform) => {
    if (!platform.packageName || !platform.appLinkHost) {
      await copyAlias();
      notify("Alias copiado. Pegalo en la billetera que uses.");
      return;
    }

    // Start copying while the click still has browser user activation, then launch
    // immediately so Android does not treat the app intent as a delayed popup.
    void copyAlias();
    if (/Android/i.test(navigator.userAgent)) {
      notify(`Alias copiado. Abriendo ${platform.name}...`);
      window.location.href = androidLaunchIntent(platform.packageName, platform.appLinkHost);
      return;
    }

    notify(`Alias copiado. Abrí ${platform.name} en tu celular y pegalo para transferir.`);
  };

  if (!open) return null;

  return (
    <>
      {toast && <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-dark-50 border border-accent-green/40 text-accent-green text-sm px-4 py-2.5 rounded-xl shadow-xl pointer-events-none animate-toast">{toast}</div>}
      <div className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${animating ? "opacity-100" : "opacity-0"}`} onClick={close} />
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${animating ? "translate-y-0" : "translate-y-full"}`}>
        <div className="bg-dark-50 rounded-t-2xl border-t border-x border-dark-300 max-w-lg mx-auto safe-area-bottom">
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 rounded-full bg-dark-300" /></div>
          <div className="px-5 pb-6">
            <div className="text-center mb-5"><p className="text-sm text-gray-400 mb-1">Pagar a {recipientName}</p><p className="text-2xl font-bold text-accent-red">{formattedAmount}</p></div>
            <div className="bg-dark-100 rounded-lg px-4 py-3 mb-4 flex items-center justify-between border border-dark-300"><div><p className="text-xs text-gray-500">Alias de pago</p><p className="text-sm font-mono text-gray-200 mt-0.5">{alias}</p></div><button onClick={() => void copyAlias().then(() => notify("Alias copiado"))} className="text-xs text-accent-green font-medium px-2 py-1 rounded hover:bg-accent-green/10">Copiar</button></div>
            <button onClick={() => void openPlatform(PLATFORMS[0])} className="w-full bg-accent-green text-dark font-bold py-3.5 px-6 rounded-xl text-base hover:brightness-110 active:scale-[0.98] transition-all mb-4">Pagar con Mercado Pago</button>
            <p className="text-xs text-gray-500 mb-2">Elegí la billetera donde vas a hacer la transferencia:</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PLATFORMS.map((platform) => <button key={platform.name} type="button" onClick={() => void openPlatform(platform)} className={`px-2 py-3 rounded-lg bg-dark-100 border text-xs text-gray-300 transition-all active:scale-[0.96] ${platform.tone}`}>{platform.name}</button>)}
            </div>
            <p className="text-[11px] text-gray-600 text-center">El alias se copia primero. En Android abrimos la app elegida; en otros dispositivos lo pegás en tu billetera.</p>
            <button onClick={close} className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-300">Cancelar</button>
          </div>
        </div>
      </div>
    </>
  );
}
