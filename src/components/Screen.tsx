import React, { type ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { useAppTheme } from "../theme";

type Props = {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  background?: string;
};

export default function Screen({ children, edges = ["top"], style, background }: Props) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: background ?? colors.background }]}
      edges={edges}
    >
      <View style={[styles.body, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
});
