import { useTaxRegimeContext } from "../shared/tax/TaxRegimeContext";

export default function useTaxRegime() {
  const { regime, loading, error, refetch } = useTaxRegimeContext();
  const labels = regime?.labels ?? {};
  const features = regime?.features ?? {};
  const components = regime?.components ?? [];
  const taxIdFormats = regime?.tax_id_formats ?? {};

  return {
    regime,
    loading,
    error,
    refetch,
    labels,
    features,
    components,
    taxIdFormats,
    jurisdiction: regime?.jurisdiction ?? "IN",
    baseCurrency: regime?.base_currency ?? "INR",
    hasWithholding: Boolean(features.has_withholding),
    hasInputTaxCredit: Boolean(features.has_input_tax_credit),
  };
}
