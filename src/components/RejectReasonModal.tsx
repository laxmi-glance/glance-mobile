import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Button from "./Button";
import { colors, radius, space } from "../theme";

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
            placeholderTextColor={colors.textMuted}
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

const styles = StyleSheet.create({
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
    fontSize: 20,
    fontWeight: "700",
    color: colors.textHeading,
  },
  lead: {
    marginTop: 6,
    marginBottom: space.lg,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: space.md,
    fontSize: 15,
    color: colors.text,
    marginBottom: space.lg,
  },
  actions: {
    flexDirection: "row",
    gap: space.md,
  },
  btn: {
    flex: 1,
  },
});
