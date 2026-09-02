import { formatAmount } from "@/lib/split-contract";

export function BalanceAmount({ value, fractionDigits = 4 }: { value: bigint; fractionDigits?: number }) {
  const [whole, fraction] = formatAmount(value, fractionDigits).split(".");

  return (
    <strong className="balance-amount" aria-label={formatAmount(value, fractionDigits)}>
      <span className="balance-whole">{whole}</span>
      {fraction && <span className="balance-decimals">.{fraction}</span>}
    </strong>
  );
}
