import React from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { BottomTabNavigationProp, createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList, RootStackParamList } from "../types/navigation";
import HomeScreen from "../screens/HomeScreen";
import ApListScreen from "../screens/ApListScreen";
import ReportsListScreen from "../screens/ReportsListScreen";
import MoreScreen from "../screens/MoreScreen";
import { colors, shadow } from "../theme";
import type { IconName } from "../config/features";
import ScanIcon from "../components/ScanIcon";
import { useRbac } from "../hooks/useRbac";

const Tab = createBottomTabNavigator<MainTabParamList>();
const SCAN_GOLD = "#D4AF37";
const TAB_BAR_BASE_HEIGHT = 64;

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

function ScanPlaceholder() {
  return <View />;
}

function ScanTabButton() {
  const { canUpload, loading } = useRbac();
  const navigation =
    useNavigation<
      CompositeNavigationProp<
        BottomTabNavigationProp<MainTabParamList>,
        NativeStackNavigationProp<RootStackParamList>
      >
    >();

  return (
    <TouchableOpacity
      onPress={() => {
        if (loading) {
          return;
        }
        if (!canUpload) {
          Alert.alert("Upload not allowed", "Your role cannot upload documents in this workspace.");
          return;
        }
        navigation.navigate("Scanner");
      }}
      style={styles.scanWrap}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Scan document"
    >
      <View style={styles.scanBtn}>
        <ScanIcon size={30} backgroundColor={colors.white} />
      </View>
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 2 },
        tabBarStyle: [
          styles.tabBar,
          {
            height: TAB_BAR_BASE_HEIGHT + bottomPad,
            paddingBottom: bottomPad,
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
        name="Scan"
        component={ScanPlaceholder}
        options={{
          title: "Scan",
          tabBarLabel: () => null,
          tabBarButton: () => <ScanTabButton />,
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
    backgroundColor: colors.surface,
    borderTopWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    overflow: "visible",
    elevation: 0,
    ...shadow.card,
  },
  scanWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    top: -22,
  },
  scanBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: SCAN_GOLD,
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
