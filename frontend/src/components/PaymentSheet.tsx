// src/components/PaymentSheet.tsx
import { useState, useEffect, useCallback } from "react";

interface Props {
  alias: string;
  amount: number;
  recipientName: string;
  open: boolean;
  onClose: () => void;
}

interface Platform {
  name: string;
  emoji: string;
  url: string | null;
  color: string;
}

const PLATFORMS: Platform[] = [
  { name: "Mercado Pago", emoji: "🔵", url: "https://mpago.la/cobros", color: "border-blue-500/30 hover:bg-blue-500/10" },
  { name: "Ualá", emoji: "🟣", url: "https://uala.com.ar", color: "border-purple-500/30 hover:bg-purple-500/10" },
  { name: "Naranja X", emoji: "🟠", url: "https://naranjax.com", color: "border-orange-500/30 hover:bg-orange-500/10" },
  { name: "MODO", emoji: "⚫", url: "https://modo.com.ar", color: "border-gray-500/30 hover:bg-gray-500/10" },
  { name: "Prex", emoji: "🟢", url: "https://prexcard.com.ar", color: "border-green-500/30 hover:bg-green-500/10" },
  { name: "Solo copiar", emoji: "📋", url: null, color: "border-dark-300 hover:bg-dark-200" },
];

export default function PaymentSheet({ alias, amount, recipientName, open, onClose }: Props) {
  const [toast, setToast] = useState({ message: "", visible: false });
  const [animating, setAnimating] = useState(false);

  const isAndroid = /Android/i.test(navigator.userAgent);

  const formattedAmount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

  // Animate open/close
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setAnimating(true));
    } else {
      setAnimating(false);
    }
  }, [open]);

  const handleClose = useCallback(() => {
    setAnimating(false);
    setTimeout(onClose, 300);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, handleClose]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

  const copyAlias = async () => {
    try {
      await navigator.clipboard.writeText(alias);
      return true;
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = alias;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    }
  };

  const handleMainPay = async () => {
    await copyAlias();
    showToast(`✅ Alias ${alias} copiado`);

    setTimeout(() => {
      if (isAndroid) {
        window.open(
          `intent://send#Intent;scheme=mercadopago;package=com.mercadopago.wallet;end`,
          "_blank"
        );
      } else {
        // iOS or desktop — open Mercado Pago web
        window.open("https://mpago.la/cobros", "_blank");
      }
    }, 600);
  };

  const handlePlatformClick = async (platform: Platform) => {
    await copyAlias();

    if (platform.url) {
      showToast(`✅ Alias copiado. Abriendo ${platform.name}...`);
      const url = platform.url;
      setTimeout(() => {
        window.open(url, "_blank");
        handleClose();
      }, 400);
    } else {
      showToast("✅ Alias copiado al portapapeles");
      setTimeout(handleClose, 1000);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Toast notification */}
      {toast.visible && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] bg-dark-50 border border-accent-green/40 text-accent-green text-sm px-4 py-2.5 rounded-xl shadow-xl shadow-black/40 pointer-events-none animate-toast">
          {toast.message}
        </div>
      )}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          animating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          animating ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-dark-50 rounded-t-2xl border-t border-x border-dark-300 max-w-lg mx-auto safe-area-bottom">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-dark-300" />
          </div>

          <div className="px-5 pb-6">
            {/* Header */}
            <div className="text-center mb-5">
              <p className="text-sm text-gray-400 mb-1">Pagar a</p>
              <p className="text-lg font-semibold text-gray-100">{recipientName}</p>
              <p className="text-2xl font-bold text-accent-red mt-1">{formattedAmount}</p>
            </div>

            {/* Alias display */}
            <div className="bg-dark-100 rounded-lg px-4 py-3 mb-4 flex items-center justify-between border border-dark-300">
              <div>
                <p className="text-xs text-gray-500">Alias de pago</p>
                <p className="text-sm font-mono text-gray-200 mt-0.5">{alias}</p>
              </div>
              <button
                onClick={async () => {
                  await copyAlias();
                  showToast("✅ Alias copiado");
                }}
                className="text-xs text-accent-green hover:text-accent-green/80 font-medium px-2 py-1 rounded hover:bg-accent-green/10 transition-colors"
              >
                Copiar
              </button>
            </div>

            {/* Main CTA */}
            <button
              onClick={handleMainPay}
              className="w-full bg-accent-green text-dark font-bold py-3.5 px-6 rounded-xl text-base
                         hover:brightness-110 active:scale-[0.98] transition-all duration-150 mb-4
                         shadow-lg shadow-accent-green/20"
            >
              💸 Pagar
            </button>

            {/* Secondary platforms */}
            <p className="text-xs text-gray-500 mb-2">O elegí tu app de pagos:</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePlatformClick(p)}
                  className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg bg-dark-100 border
                             transition-all duration-150 active:scale-[0.96] ${p.color}`}
                >
                  <span className="text-lg">{p.emoji}</span>
                  <span className="text-[11px] text-gray-400 leading-tight text-center">{p.name}</span>
                </button>
              ))}
            </div>

            {/* Help text */}
            <p className="text-[11px] text-gray-600 text-center leading-relaxed">
              El alias ya está copiado en tu portapapeles.
              <br />
              Pegalo en la app que uses para pagar.
            </p>

            {/* Cancel */}
            <button
              onClick={handleClose}
              className="w-full mt-3 py-2.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
