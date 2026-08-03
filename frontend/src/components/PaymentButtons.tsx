// src/components/PaymentButtons.tsx
import { useState } from "react";

interface Props {
  alias: string;
  amount: number;
}

interface Platform {
  name: string;
  emoji: string;
  url: string | null;
}

const PLATFORMS: Platform[] = [
  { name: "Mercado Pago", emoji: "💙", url: "https://mpago.la/cobros" },
  { name: "Ualá", emoji: "💳", url: "https://uala.com.ar" },
  { name: "Naranja X", emoji: "🟠", url: "https://naranjax.com" },
  { name: "MODO", emoji: "📱", url: "https://modo.com.ar" },
  { name: "Prex", emoji: "💸", url: "https://prexcard.com" },
  { name: "Otra app", emoji: "📋", url: null },
];

export default function PaymentButtons({ alias, amount: _amount }: Props) {
  const [toast, setToast] = useState({ message: "", visible: false });

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  };

  const handleClick = async (platform: Platform) => {
    await navigator.clipboard.writeText(alias);
    if (platform.url) {
      showToast(`✅ Alias copiado. Abriendo ${platform.name}...`);
      const url = platform.url;
      setTimeout(() => window.open(url, "_blank"), 800);
    } else {
      showToast("✅ Alias copiado al portapapeles");
    }
  };

  return (
    <div className="mt-3">
      {toast.visible && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-accent-green text-white text-sm px-4 py-2 rounded-lg shadow-lg pointer-events-none">
          {toast.message}
        </div>
      )}
      <p className="text-xs text-gray-500 mb-2">Pagar con:</p>
      <div className="grid grid-cols-2 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handleClick(p)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-200 border border-dark-300 hover:border-accent-green/50 transition-colors text-sm text-gray-300 text-left"
          >
            <span>{p.emoji}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
