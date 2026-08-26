import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import BrandMark from "./BrandMark";
import { radius, useAppTheme } from "../theme";

type Props = {
  uri?: string | null;
  size?: number;
};

export default function CompanyLogo({ uri, size = 56 }: Props) {
  const { colors } = useAppTheme();
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(uri) && !failed;

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: uri as string }}
          style={{ width: size - 8, height: size - 8 }}
          resizeMode="contain"
          accessibilityLabel="Company logo"
          onError={() => setFailed(true)}
        />
      ) : (
        <BrandMark size={size - 16} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
