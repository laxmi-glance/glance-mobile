import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

const DOC = "#2C2C2C";
const TEXT = "#8E8E8E";
const SCAN_GOLD = "#D4AF37";
const CORNER = {
  tl: "#EA4335",
  tr: "#FBBC04",
  bl: "#4285F4",
  br: "#34A853",
};

type Props = {
  size?: number;
  backgroundColor?: string;
  paused?: boolean;
};

export default function ScanIcon({
  size = 30,
  backgroundColor = "#FFFFFF",
  paused = false,
}: Props) {
  const progress = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const docW = size * 0.46;
  const docH = size * 0.6;
  const docLeft = (size - docW) / 2;
  const docTop = (size - docH) / 2;
  const travel = docH * 0.58;
  const corner = size * 0.24;
  const thickness = Math.max(2.2, size * 0.08);
  const lineWidths = [0.78, 0.52, 0.86, 0.4];

  useEffect(() => {
    if (paused) {
      loopRef.current?.stop();
      progress.setValue(0.5);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loopRef.current = loop;
    loop.start();
    return () => loop.stop();
  }, [paused, progress]);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-travel / 2, travel / 2],
  });

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

      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          width: 5,
          height: size * 0.12,
          backgroundColor,
          top: docTop + docH * 0.4,
          left: docLeft - 1,
        }}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.scanRow,
          {
            width: size * 0.92,
            left: size * 0.04,
            top: size / 2 - 2.5,
            transform: [{ translateY }],
          },
        ]}
      >
        <View style={[styles.dot, { backgroundColor: SCAN_GOLD }]} />
        <View style={[styles.beam, { backgroundColor: SCAN_GOLD }]} />
        <View style={[styles.dot, { backgroundColor: SCAN_GOLD }]} />
      </Animated.View>
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
  scanRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
  },
  beam: {
    flex: 1,
    height: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
