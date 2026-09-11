import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { fonts, useAppTheme } from "../theme";

type Props = {
  size?: number;
};

export default function BrandLockup({ size = 28 }: Props) {
  const { colors, isDark } = useAppTheme();
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Glancewise">
      <Image
        source={require("../../assets/brand-mark.png")}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
      <Text
        style={[
          styles.wordmark,
          { fontSize: size * 0.72, color: isDark ? colors.textHeading : colors.brandNavy },
        ]}
      >
        Glancewise
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  wordmark: {
    fontFamily: fonts.bold,
    letterSpacing: -0.4,
  },
});
