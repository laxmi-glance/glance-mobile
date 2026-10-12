import React, { useMemo } from "react";
import { Text, View } from "react-native";
import useTaxRegime from "../../hooks/useTaxRegime";
import { formatMoney } from "../../utils/money";
import { useThemedStyles, type ThemeTokens } from "../../theme";

const LEGACY_BUCKETS = [
  { key: "cgst_amount", code: "IN_CGST", fallbackLabel: "CGST" },
  { key: "sgst_amount", code: "IN_SGST", fallbackLabel: "SGST" },
  { key: "igst_amount", code: "IN_IGST", fallbackLabel: "IGST" },
  { key: "utgst_amount", code: "IN_UTGST", fallbackLabel: "UTGST" },
  { key: "cess_amount", code: "IN_CESS", fallbackLabel: "Cess" },
] as const;

type TaxComponentRow = {
  code?: string;
  label?: string;
  amount?: string | number | null;
};

type Props = {
  components?: TaxComponentRow[] | null;
  legacyBreakdown?: Record<string, string | number | null | undefined> | null;
  currency?: string;
};

export default function TaxBreakdown({ components, legacyBreakdown, currency = "INR" }: Props) {
  const styles = useThemedStyles(createStyles);
  const { components: regimeComponents, jurisdiction } = useTaxRegime();

  const labelByCode = useMemo(() => {
    const map: Record<string, string> = {};
    regimeComponents.forEach((row) => {
      if (row.code) {
        map[row.code] = row.label || row.code;
      }
    });
    return map;
  }, [regimeComponents]);

  const rows = useMemo(() => {
    if (Array.isArray(components) && components.length > 0) {
      return components
        .filter((row) => row && Number(row.amount) !== 0)
        .map((row) => ({
          key: row.code || row.label || "tax",
          label: labelByCode[row.code || ""] || row.label || row.code || "Tax",
          amount: row.amount,
        }));
    }
    if (!legacyBreakdown || jurisdiction !== "IN") {
      return [];
    }
    return LEGACY_BUCKETS.map(({ key, code, fallbackLabel }) => {
      const amount = legacyBreakdown[key];
      if (amount == null || Number(amount) === 0) return null;
      return {
        key,
        label: labelByCode[code] || fallbackLabel,
        amount,
      };
    }).filter(Boolean) as { key: string; label: string; amount: string | number }[];
  }, [components, legacyBreakdown, jurisdiction, labelByCode]);

  if (!rows.length) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.amount}>{formatMoney(row.amount, currency)}</Text>
        </View>
      ))}
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    wrap: {
      gap: 8,
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    label: {
      ...type.callout,
      color: colors.textSecondary,
      flex: 1,
      marginRight: 12,
    },
    amount: {
      ...type.calloutMedium,
      color: colors.textHeading,
      fontVariant: ["tabular-nums"] as const,
    },
  };
}
