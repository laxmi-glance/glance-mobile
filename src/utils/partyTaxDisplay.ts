import type { PartyBrief } from "../types/models";
import { readIncomeTaxId, readIndirectTaxId } from "../shared/tax/taxApiKeys";
import useTaxRegime from "../hooks/useTaxRegime";

/** Labels for vendor tax ids on read-only AP screens (regime-aware when provider is mounted). */
export function usePartyTaxDisplayRows(
  party: PartyBrief | null | undefined
): { label: string; value: string }[] {
  const { taxIdFormats } = useTaxRegime();
  const indirectLabel = taxIdFormats.indirect_tax_id?.label ?? "GSTIN";
  const incomeLabel = taxIdFormats.income_tax_id?.label ?? "PAN";
  const rows: { label: string; value: string }[] = [];
  const gstin = readIndirectTaxId(party ?? undefined);
  const pan = readIncomeTaxId(party ?? undefined);
  if (gstin) {
    rows.push({ label: indirectLabel, value: gstin });
  }
  if (pan) {
    rows.push({ label: incomeLabel, value: pan });
  }
  return rows;
}
