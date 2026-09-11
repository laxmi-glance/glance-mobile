import React from "react";
import { StyleSheet, View } from "react-native";

const DOC = "#2C2C2C";
const TEXT = "#8E8E8E";
const CORNER = {
  tl: "#EA4335",
  tr: "#FBBC04",
  bl: "#4285F4",
  br: "#34A853",
};

type Props = {
  size?: number;
};

export default function ScanIcon({ size = 30 }: Props) {
  const docW = size * 0.46;
  const docH = size * 0.6;
  const docLeft = (size - docW) / 2;
  const docTop = (size - docH) / 2;
  const corner = size * 0.24;
  const thickness = Math.max(2.2, size * 0.08);
  const lineWidths = [0.78, 0.52, 0.86, 0.4];

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.corner,
          {
            width: corner,
            height: corner,
            borderColor: CORNER.tl,
            borderTopWidth: thickness,
            borderLeftWidth: thickness,
            top: 0,
            left: 0,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            width: corner,
            height: corner,
            borderColor: CORNER.tr,
            borderTopWidth: thickness,
            borderRightWidth: thickness,
            top: 0,
            right: 0,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            width: corner,
            height: corner,
            borderColor: CORNER.bl,
            borderBottomWidth: thickness,
            borderLeftWidth: thickness,
            bottom: 0,
            left: 0,
          },
        ]}
      />
      <View
        style={[
          styles.corner,
          {
            width: corner,
            height: corner,
            borderColor: CORNER.br,
            borderBottomWidth: thickness,
            borderRightWidth: thickness,
            bottom: 0,
            right: 0,
          },
        ]}
      />

      <View
        style={[
          styles.doc,
          {
            width: docW,
            height: docH,
            top: docTop,
            left: docLeft,
            borderColor: DOC,
            paddingTop: size * 0.08,
            paddingHorizontal: size * 0.06,
          },
        ]}
      >
        {lineWidths.map((width, index) => (
          <View
            key={index}
            style={{
              width: docW * width * 0.72,
              height: Math.max(1.4, size * 0.045),
              borderRadius: 1,
              backgroundColor: TEXT,
              marginBottom: size * 0.055,
            }}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: "absolute",
    borderRadius: 1.5,
  },
  doc: {
    position: "absolute",
    borderWidth: 2,
    borderRadius: 2,
  },
});
