import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, space } from "../theme";

type Props = {
  canApprove: boolean;
  canReject: boolean;
  actingOn?: "approved" | "rejected" | null;
  onApprove: () => void;
  onReject: () => void;
};

export default function ApprovalActions({
  canApprove,
  canReject,
  actingOn,
  onApprove,
  onReject,
}: Props) {
  const acting = Boolean(actingOn);
  if (!canApprove && !canReject) {
    return null;
  }

  if (canApprove && canReject) {
    return (
      <View style={styles.card}>
        <Text style={styles.kicker}>Decision needed</Text>
        <Text style={styles.lead}>Approve or reject this payable.</Text>
        <View style={styles.pair}>
          <ChoiceButton
            kind="reject"
            label="Reject"
            hint="Send back"
            icon="close"
            disabled={acting}
            loading={actingOn === "rejected"}
            onPress={onReject}
          />
          <ChoiceButton
            kind="approve"
            label="Approve"
            hint="Confirm"
            icon="checkmark"
            disabled={acting}
            loading={actingOn === "approved"}
            onPress={onApprove}
          />
        </View>
      </View>
    );
  }

  if (canReject) {
    return (
      <View style={[styles.card, styles.cardApproved]}>
        <View style={styles.statusRow}>
          <View style={[styles.statusIcon, styles.statusIconApproved]}>
            <Ionicons name="checkmark" size={16} color={colors.success} />
          </View>
          <View style={styles.statusCopy}>
            <Text style={styles.statusTitle}>Approved</Text>
            <Text style={styles.lead}>Reject this payable if that decision should change.</Text>
          </View>
        </View>
        <ActionRow
          label="Reject document"
          icon="close-circle-outline"
          tone="danger"
          disabled={acting}
          loading={actingOn === "rejected"}
          onPress={onReject}
        />
      </View>
    );
  }

  return (
    <View style={[styles.card, styles.cardRejected]}>
      <View style={styles.statusRow}>
        <View style={[styles.statusIcon, styles.statusIconRejected]}>
          <Ionicons name="close" size={16} color={colors.danger} />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>Rejected</Text>
          <Text style={styles.lead}>Approve this payable if that decision should change.</Text>
        </View>
      </View>
      <ActionRow
        label="Approve document"
        icon="checkmark-circle-outline"
        tone="success"
        disabled={acting}
        loading={actingOn === "approved"}
        onPress={onApprove}
      />
    </View>
  );
}

function ChoiceButton({
  kind,
  label,
  hint,
  icon,
  disabled,
  loading,
  onPress,
}: {
  kind: "approve" | "reject";
  label: string;
  hint: string;
  icon: "checkmark" | "close";
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const approve = kind === "approve";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.choice,
        approve ? styles.choiceApprove : styles.choiceReject,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={approve ? colors.white : colors.danger} />
      ) : (
        <>
          <View
            style={[
              styles.choiceIcon,
              approve ? styles.choiceIconApprove : styles.choiceIconReject,
            ]}
          >
            <Ionicons name={icon} size={20} color={approve ? colors.white : colors.danger} />
          </View>
          <Text
            style={[
              styles.choiceLabel,
              approve ? styles.choiceLabelLight : styles.choiceLabelReject,
            ]}
          >
            {label}
          </Text>
          <Text
            style={[styles.choiceHint, approve ? styles.choiceHintLight : styles.choiceHintReject]}
          >
            {hint}
          </Text>
        </>
      )}
    </Pressable>
  );
}

function ActionRow({
  label,
  icon,
  tone,
  disabled,
  loading,
  onPress,
}: {
  label: string;
  icon: "checkmark-circle-outline" | "close-circle-outline";
  tone: "success" | "danger";
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const danger = tone === "danger";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionRow,
        danger ? styles.actionRowDanger : styles.actionRowSuccess,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={danger ? colors.danger : colors.success} />
      ) : (
        <>
          <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.success} />
          <Text
            style={[
              styles.actionRowLabel,
              danger ? styles.actionRowLabelDanger : styles.actionRowLabelSuccess,
            ]}
          >
            {label}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={danger ? colors.danger : colors.success}
          />
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    marginBottom: space.md,
  },
  cardApproved: {
    backgroundColor: colors.successSoft,
    borderColor: "#BBF7D0",
  },
  cardRejected: {
    backgroundColor: colors.dangerSoft,
    borderColor: "#FECACA",
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.warning,
    marginBottom: 4,
  },
  lead: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  pair: {
    flexDirection: "row",
    gap: space.md,
    marginTop: space.lg,
  },
  choice: {
    flex: 1,
    minHeight: 118,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
  },
  choiceApprove: {
    backgroundColor: colors.success,
  },
  choiceReject: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  choiceIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  choiceIconApprove: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  choiceIconReject: {
    backgroundColor: colors.dangerSoft,
  },
  choiceLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  choiceLabelLight: {
    color: colors.white,
  },
  choiceLabelReject: {
    color: colors.danger,
  },
  choiceHint: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: "600",
  },
  choiceHintLight: {
    color: "rgba(255,255,255,0.82)",
  },
  choiceHintReject: {
    color: "#F87171",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.md,
    marginBottom: space.md,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  statusIconApproved: {
    backgroundColor: "#DCFCE7",
  },
  statusIconRejected: {
    backgroundColor: "#FEE2E2",
  },
  statusCopy: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textHeading,
    marginBottom: 2,
  },
  actionRow: {
    minHeight: 48,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
  },
  actionRowDanger: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  actionRowSuccess: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  actionRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  actionRowLabelDanger: {
    color: colors.danger,
  },
  actionRowLabelSuccess: {
    color: colors.success,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
});
