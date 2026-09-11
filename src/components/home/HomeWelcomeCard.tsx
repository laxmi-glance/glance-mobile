import React from "react";
import { Text, View } from "react-native";
import CompanyLogo from "../CompanyLogo";
import { makeShadow, radius, space, useThemedStyles, type ThemeTokens } from "../../theme";

type Props = {
  greeting: string;
  companyName: string;
  logoUri?: string | null;
};

export default function HomeWelcomeCard({ greeting, companyName, logoUri }: Props) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.card}>
      <View style={styles.identity}>
        <CompanyLogo uri={logoUri} size={48} />
        <View style={styles.copy}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}
          </Text>
          <Text style={styles.company} numberOfLines={2}>
            {companyName}
          </Text>
        </View>
      </View>
    </View>
  );
}

function createStyles({ colors, type, isDark }: ThemeTokens) {
  return {
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: space.lg,
      ...makeShadow(isDark),
    },
    identity: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 12,
    },
    copy: {
      flex: 1,
      minWidth: 0,
    },
    greeting: {
      ...type.heading,
    },
    company: {
      ...type.meta,
      marginTop: 3,
    },
  };
}
