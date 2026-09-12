import React, { useEffect } from "react";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "../types/navigation";
import HomeScreen from "../screens/HomeScreen";
import ApListScreen from "../screens/ApListScreen";
import ReportsListScreen from "../screens/ReportsListScreen";
import MoreScreen from "../screens/MoreScreen";
import { fonts, makeShadow, navigationFonts, useAppTheme } from "../theme";
import type { IconName } from "../config/features";
import { UploadSourceProvider } from "../components/UploadSourceMenu";
import { useUploadSource } from "../hooks/useUploadSourceMenu";
import { useUnreadCount } from "../hooks/useUnreadCount";

const Tab = createBottomTabNavigator<MainTabParamList>();
const UPLOAD_GOLD = "#D4AF37";
const TAB_BAR_BASE_HEIGHT = 64;
const UPLOAD_SIZE = 58;
const UPLOAD_HALO = 76;

function TabBarIcon({
  color,
  focused,
  active,
  idle,
}: {
  color: string;
  focused: boolean;
  active: IconName;
  idle: IconName;
}) {
  return <Ionicons name={focused ? active : idle} size={22} color={color} />;
}

function UploadPlaceholder() {
  return <View />;
}

function UploadTabButton() {
  const { colors } = useAppTheme();
  const { visible, toggle } = useUploadSource();

  return (
    <TouchableOpacity
      onPress={toggle}
      style={styles.uploadWrap}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={visible ? "Close upload options" : "Upload document"}
    >
      <View style={[styles.uploadHalo, { backgroundColor: colors.background }]}>
        <View style={[styles.uploadBtn, { backgroundColor: colors.white }]}>
          {visible ? (
            <Ionicons name="close" size={28} color={colors.brandNavy} />
          ) : (
            <Feather name="upload" size={26} color={colors.brandNavy} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, hydrateFromServer } = useAppTheme();
  const bottomPad = Math.max(insets.bottom, 10);
  const unread = useUnreadCount();
  const moreBadge = unread > 0 ? (unread > 99 ? "99+" : String(unread)) : undefined;

  useEffect(() => {
    void hydrateFromServer();
  }, [hydrateFromServer]);

  return (
    <UploadSourceProvider bottomOffset={TAB_BAR_BASE_HEIGHT + bottomPad + UPLOAD_HALO / 2 + 8}>
      <MainTabNavigator
        colors={colors}
        isDark={isDark}
        bottomPad={bottomPad}
        moreBadge={moreBadge}
      />
    </UploadSourceProvider>
  );
}

function MainTabNavigator({
  colors,
  isDark,
  bottomPad,
  moreBadge,
}: {
  colors: ReturnType<typeof useAppTheme>["colors"];
  isDark: boolean;
  bottomPad: number;
  moreBadge: string | undefined;
}) {
  const { hide } = useUploadSource();

  return (
    <Tab.Navigator
      screenListeners={({ route }) => ({
        focus: () => {
          if (route.name !== "Upload") {
            hide();
          }
        },
      })}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: navigationFonts.tabLabel,
        tabBarItemStyle: { overflow: "visible" },
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            height: TAB_BAR_BASE_HEIGHT + bottomPad,
            paddingBottom: bottomPad,
            ...makeShadow(isDark),
          },
        ],
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} focused={focused} active="home" idle="home-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="AP"
        component={ApListScreen}
        options={{
          title: "Documents",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              active="documents"
              idle="documents-outline"
            />
          ),
        }}
      />
      <Tab.Screen
        name="Upload"
        component={UploadPlaceholder}
        options={{
          title: "Upload",
          tabBarLabel: () => null,
          tabBarButton: () => <UploadTabButton />,
        }}
        listeners={{
          tabPress: (event) => {
            event.preventDefault();
          },
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsListScreen}
        options={{
          title: "Reports",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon
              color={color}
              focused={focused}
              active="bar-chart"
              idle="bar-chart-outline"
            />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{
          tabBarBadge: moreBadge,
          tabBarBadgeStyle: [
            styles.moreBadge,
            { backgroundColor: colors.danger, color: colors.white },
          ],
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} focused={focused} active="menu" idle="menu-outline" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    overflow: "visible",
    elevation: 0,
  },
  moreBadge: {
    minWidth: 16,
    height: 16,
    fontSize: 9,
    fontFamily: fonts.bold,
    lineHeight: 14,
  },
  uploadWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    top: -(UPLOAD_HALO / 2),
    overflow: "visible",
  },
  uploadHalo: {
    width: UPLOAD_HALO,
    height: UPLOAD_HALO,
    borderRadius: UPLOAD_HALO / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadBtn: {
    width: UPLOAD_SIZE,
    height: UPLOAD_SIZE,
    borderRadius: UPLOAD_SIZE / 2,
    borderWidth: 2,
    borderColor: UPLOAD_GOLD,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#8A6D1A",
        shadowOpacity: 0.28,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
});
