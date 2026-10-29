import Image from "next/image";
import { Check } from "lucide-react";

const methods = [
  { name: "Google Pay", logo: "/brand/payments/google-pay.svg" },
  { name: "PhonePe", logo: "/brand/payments/phonepe.svg" },
  { name: "Paytm", logo: "/brand/payments/paytm.svg" },
] as const;

export function UpiPaymentMethods({ selected, disabled, onSelect }: {
  selected: string;
  disabled: boolean;
  onSelect: (app: string) => void;
}) {
  return (
    <div aria-label="UPI payment apps" className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
      {methods.map(method => {
        const active = selected === method.name;
        return (
          <button
            key={method.name}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(method.name)}
            aria-label={`Pay with ${method.name}`}
            className={`group relative min-w-0 rounded-2xl border p-2 pb-3 text-center transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zenith-400 disabled:cursor-wait disabled:opacity-50 sm:p-3 ${active ? "border-zenith-400 bg-zenith-400/10 ring-1 ring-zenith-400/30" : "border-white/10 bg-white/[.03] hover:border-zenith-400/50 hover:bg-white/[.07]"}`}
          >
            <span className="flex h-16 w-full items-center justify-center rounded-xl bg-white px-2 sm:px-3">
              <Image src={method.logo} alt="" width={112} height={40} className="h-10 w-full max-w-28 object-contain" />
            </span>
            <span className="mt-3 block whitespace-nowrap text-xs font-semibold text-white/85 sm:text-sm">{method.name}</span>
            <span aria-hidden="true" className={`mx-auto mt-2 flex h-4 w-4 items-center justify-center rounded-full border ${active ? "border-zenith-400 bg-zenith-400 text-black" : "border-white/25 group-hover:border-zenith-400/60"}`}>
              {active && <Check size={11} strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
