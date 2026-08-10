import { useState } from "react";
import type { BalanceTransaction } from "../types";
import PaymentSheet from "./PaymentSheet";

interface Props {
  transaction: BalanceTransaction;
  currentParticipantId: string;
  inflationNote: string;
}

export default function BalanceCard({ transaction, currentParticipantId, inflationNote }: Props) {
  const { from_participant, to_participant, amount_adjusted } = transaction;
  const [sheetOpen, setSheetOpen] = useState(false);

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
          {inflationNote.startsWith("Los importes") && (
            <div className="mt-2"><span className="badge">Incluye ajuste según IPC INDEC</span></div>
          )}

          {iDebtor && (
            to_participant.mp_alias ? (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-2">
                  Alias: <span className="text-gray-200 font-medium font-mono">{to_participant.mp_alias}</span>
                </p>
                <button
                  onClick={() => setSheetOpen(true)}
                  className="bg-accent-green/10 text-accent-green border border-accent-green/30 text-sm font-medium px-4 py-2 rounded-lg hover:bg-accent-green/20 active:scale-[0.97] transition-all duration-150"
                >
                  Pagar
                </button>
                <PaymentSheet
                  alias={to_participant.mp_alias}
                  amount={amount_adjusted}
                  recipientName={to_participant.name}
                  open={sheetOpen}
                  onClose={() => setSheetOpen(false)}
                />
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">{to_participant.name} no cargó su alias de pago aún.</p>
            )
          )}
        </div>
        <span className={`text-lg font-bold whitespace-nowrap ${iDebtor ? "text-accent-red" : iCreditor ? "text-accent-green" : "text-gray-300"}`}>
          {formattedAmount}
        </span>
      </div>
    </div>
  );
}
