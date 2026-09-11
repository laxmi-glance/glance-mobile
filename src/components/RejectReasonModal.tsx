import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Text, TextInput, View } from "react-native";
import Button from "./Button";
import { radius, space, useAppTheme, useThemedStyles, type ThemeTokens } from "../theme";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (remarks: string) => void;
  loading?: boolean;
  title?: string;
  lead?: string;
};

export default function RejectReasonModal({
  visible,
  onClose,
  onSubmit,
  loading,
  title = "Reject document",
  lead = "A reason is required so the submitter knows what to fix.",
}: Props) {
  const { colors } = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [remarks, setRemarks] = useState("");

  const handleClose = () => {
    setRemarks("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.lead}>{lead}</Text>
          <TextInput
            style={styles.input}
            placeholder="Rejection reason"
            placeholderTextColor={colors.textPlaceholder}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <Button label="Cancel" variant="ghost" onPress={handleClose} style={styles.btn} />
            <Button
              label="Reject"
              variant="danger"
              loading={loading}
              disabled={!remarks.trim()}
              onPress={() => onSubmit(remarks.trim())}
              style={styles.btn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles({ colors, type }: ThemeTokens) {
  return {
    overlay: {
      flex: 1,
      backgroundColor: "rgba(15, 0, 51, 0.45)",
      justifyContent: "flex-end",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: space.xxl,
      paddingBottom: 36,
    },
    title: {
      ...type.title,
    },
    lead: {
      ...type.callout,
      marginTop: 6,
      marginBottom: space.lg,
      color: colors.textSecondary,
    },
    input: {
      ...type.input,
      minHeight: 96,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: radius.md,
      padding: space.md,
      marginBottom: space.lg,
      textAlignVertical: "top",
    },
    actions: {
      flexDirection: "row",
      gap: space.md,
    },
    btn: {
      flex: 1,
    },
  };
}
