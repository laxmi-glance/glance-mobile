import React from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { APP_FEATURES, comingSoonCopy, type AppFeature } from "../config/features";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { colors, radius, space } from "../theme";

type Props = {
  onOpenFeature: (feature: AppFeature) => void;
};

export default function FeatureGrid({ onOpenFeature }: Props) {
  const unread = useUnreadCount();

  return (
    <View style={styles.grid}>
      {APP_FEATURES.map((feature) => (
        <FeatureTile
          key={feature.id}
          feature={feature}
          unread={unread}
          onOpenFeature={onOpenFeature}
        />
      ))}
    </View>
  );
}

function FeatureTile({
  feature,
  unread,
  onOpenFeature,
}: {
  feature: AppFeature;
  unread: number;
  onOpenFeature: (feature: AppFeature) => void;
}) {
  const handlePress = () => {
    if (feature.available && (feature.tab || feature.stack)) {
      onOpenFeature(feature);
      return;
    }
    Alert.alert("Coming soon", comingSoonCopy(feature.title));
  };

  const isNotifications = feature.id === "notifications";
  const newCount = isNotifications ? unread : 0;
  const countLabel = newCount > 99 ? "99+" : String(newCount);
  const subtitle =
    isNotifications && newCount > 0
      ? `${newCount} new notification${newCount === 1 ? "" : "s"}`
      : feature.subtitle;

  return (
    <TouchableOpacity style={styles.tile} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.tileTop}>
        <View style={[styles.iconWrap, !feature.available && styles.iconMuted]}>
          <Ionicons
            name={feature.icon}
            size={22}
            color={feature.available ? colors.brand : colors.textMuted}
          />
        </View>
        {newCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{countLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title}>{feature.title}</Text>
      <Text style={[styles.subtitle, newCount > 0 && styles.subtitleAlert]} numberOfLines={2}>
        {subtitle}
      </Text>
      {!feature.available ? <Text style={styles.soon}>Coming soon</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space.md,
  },
  tile: {
    width: "48.5%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    minHeight: 132,
  },
  tileTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: space.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  iconMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textHeading,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  subtitleAlert: {
    color: colors.danger,
    fontWeight: "600",
  },
  soon: {
    marginTop: space.sm,
    fontSize: 11,
    fontWeight: "700",
    color: colors.brand,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
