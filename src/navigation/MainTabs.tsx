import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { MainTabParamList } from "../types/navigation";
import HomeScreen from "../screens/HomeScreen";
import ApListScreen from "../screens/ApListScreen";
import ProcessingQueueScreen from "../screens/ProcessingQueueScreen";
import MoreScreen from "../screens/MoreScreen";
import { useUnreadCount } from "../hooks/useUnreadCount";
import { colors } from "../theme";
import type { IconName } from "../config/features";

const Tab = createBottomTabNavigator<MainTabParamList>();

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

export default function MainTabs() {
  const unread = useUnreadCount();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 88,
          paddingTop: 6,
        },
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
          title: "Payables",
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} focused={focused} active="receipt" idle="receipt-outline" />
          ),
        }}
      />
      <Tab.Screen
        name="Queue"
        component={ProcessingQueueScreen}
        options={{
          title: "Queue",
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
        name="More"
        component={MoreScreen}
        options={{
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarIcon: ({ color, focused }) => (
            <TabBarIcon color={color} focused={focused} active="menu" idle="menu-outline" />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
