// src/components/BalanceCard.tsx
import type { BalanceTransaction } from "../types";
import PaymentButtons from "./PaymentButtons";

interface Props {
  transaction: BalanceTransaction;
  currentParticipantId: string;
}

export default function BalanceCard({ transaction, currentParticipantId }: Props) {
  const { from_participant, to_participant, amount_adjusted } = transaction;

  const iDebtor = from_participant.id === currentParticipantId;
  const iCreditor = to_participant.id === currentParticipantId;

  const formattedAmount = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount_adjusted);

  let bgClass = "bg-dark-50 border-dark-300";
  let textContent: string;

  if (iDebtor) {
    bgClass = "bg-accent-red/5 border-accent-red/20";
    textContent = `Le debés ${formattedAmount} a ${to_participant.name}`;
  } else if (iCreditor) {
    bgClass = "bg-accent-green/5 border-accent-green/20";
    textContent = `${from_participant.name} te debe ${formattedAmount}`;
  } else {
    textContent = `${from_participant.name} le debe ${formattedAmount} a ${to_participant.name}`;
  }

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${bgClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-100 leading-relaxed">{textContent}</p>
          <div className="mt-2">
            <span className="badge">
              <span>📈</span>
              Ajustado por inflación
            </span>
          </div>

          {/* Alias y botones de pago — solo visible al deudor */}
          {iDebtor && (
            to_participant.mp_alias ? (
              <>
                <p className="mt-2 text-xs text-gray-400">
                  📲 Alias: <span className="text-gray-200 font-medium">{to_participant.mp_alias}</span>
                </p>
                <PaymentButtons alias={to_participant.mp_alias} amount={amount_adjusted} />
              </>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                ⚠️ {to_participant.name} no cargó su alias de pago aún
              </p>
            )
          )}
        </div>
        <span
          className={`text-lg font-bold whitespace-nowrap ${
            iDebtor ? "text-accent-red" : iCreditor ? "text-accent-green" : "text-gray-300"
          }`}
        >
          {formattedAmount}
        </span>
      </div>
    </div>
  );
}
