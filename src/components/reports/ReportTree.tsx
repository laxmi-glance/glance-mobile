import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Card from "../Card";
import { formatReportAmount, movementCaption } from "../../utils/reportLayout";
import { space, useAppTheme, useThemedStyles, type ThemeTokens } from "../../theme";
import type { ReportNode } from "../../types/reports";

type Props = {
  nodes: ReportNode[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  forceExpand?: boolean;
};

export default function ReportTree({ nodes, expanded, onToggle, forceExpand = false }: Props) {
  const styles = useThemedStyles(createStyles);
  if (!nodes.length) {
    return null;
  }

  return (
    <View style={styles.list}>
      {nodes.map((node) => (
        <Card key={node.id} padded={false} style={styles.card}>
          <ReportNodeRow
            node={node}
            depth={0}
            expanded={expanded}
            onToggle={onToggle}
            forceExpand={forceExpand}
          />
        </Card>
      ))}
    </View>
  );
}

function ReportNodeRow({
  node,
  depth,
  expanded,
  onToggle,
  forceExpand,
}: {
  node: ReportNode;
  depth: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  forceExpand: boolean;
}) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const canToggle = node.kind !== "section" && node.children.length > 0;
  const open = node.kind === "section" || forceExpand || Boolean(expanded[node.id]);
  const amount = formatReportAmount(node);
  const showAmount = node.mode === "drcr" || node.amount != null;
  const detail = movementCaption(node);
  const loss = node.kind === "result" && /loss/i.test(node.label);

  const row = (
    <View
      style={[
        styles.row,
        { paddingLeft: space.lg + depth * 14 },
        node.kind === "section" && styles.section,
        node.kind === "result" && (loss ? styles.loss : styles.profit),
        node.kind === "total" && styles.total,
      ]}
    >
      {canToggle ? (
        <Ionicons
          name={open ? "chevron-down" : "chevron-forward"}
          size={16}
          color={colors.textMuted}
        />
      ) : (
        <View style={styles.chevronSpacer} />
      )}
      <View style={styles.text}>
        <Text
          style={[
            node.kind === "account" ? styles.account : styles.label,
            node.kind === "section" && styles.sectionLabel,
            loss && styles.lossText,
            node.kind === "result" && !loss && styles.profitText,
          ]}
        >
          {node.label}
        </Text>
        {detail ? <Text style={styles.detail}>{detail}</Text> : null}
      </View>
      {showAmount ? (
        <Text
          style={[
            styles.amount,
            node.kind !== "account" && styles.amountStrong,
            loss && styles.lossText,
            node.kind === "result" && !loss && styles.profitText,
          ]}
        >
          {amount}
        </Text>
      ) : null}
    </View>
  );

  return (
    <View>
      {canToggle ? (
        <TouchableOpacity
          onPress={() => onToggle(node.id)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
        >
          {row}
        </TouchableOpacity>
      ) : (
        row
      )}
      {open
        ? node.children.map((child) => (
            <ReportNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              forceExpand={forceExpand}
            />
          ))
        : null}
    </View>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    list: {
      gap: space.md,
    },
    card: {
      overflow: "hidden" as const,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: space.sm,
      paddingRight: space.lg,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    section: {
      backgroundColor: colors.surfaceMuted,
    },
    profit: {
      backgroundColor: colors.successSoft,
    },
    loss: {
      backgroundColor: colors.dangerSoft,
    },
    total: {
      backgroundColor: colors.brandSoft,
    },
    chevronSpacer: {
      width: 16,
    },
    text: {
      flex: 1,
    },
    label: {
      ...type.cardTitle,
    },
    sectionLabel: {
      ...type.heading,
    },
    account: {
      ...type.callout,
    },
    detail: {
      ...type.caption,
      marginTop: 2,
    },
    amount: {
      ...type.meta,
      color: colors.text,
      textAlign: "right" as const,
      maxWidth: 150,
    },
    amountStrong: {
      ...type.label,
    },
    profitText: {
      color: colors.success,
    },
    lossText: {
      color: colors.danger,
    },
  };
}
