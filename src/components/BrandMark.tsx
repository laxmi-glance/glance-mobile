import React from "react";
import { Image, StyleSheet, View } from "react-native";
import { colors, radius } from "../theme";

type Props = {
  size?: number;
  framed?: boolean;
};

export default function BrandMark({ size = 40, framed = false }: Props) {
  const mark = (
    <Image
      source={require("../../assets/brand-mark.png")}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="Glancewise"
    />
  );

  if (!framed) {
    return mark;
  }

  return (
    <View style={[styles.frame, { width: size + 16, height: size + 16, borderRadius: radius.md }]}>
      {mark}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandNavy,
  },
});
