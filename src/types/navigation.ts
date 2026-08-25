import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";

export type RootStackParamList = {
  Login: undefined;
  WebAuthLogin: undefined;
  CompanySelection: undefined;
  Main: undefined;
  DocumentDetail: { documentId: string };
  ApDocument: { documentId: string };
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  AP: undefined;
  Queue: undefined;
  More: undefined;
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;
export type WebAuthLoginScreenProps = NativeStackScreenProps<RootStackParamList, "WebAuthLogin">;
export type CompanySelectionScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "CompanySelection"
>;
export type DocumentDetailScreenProps = NativeStackScreenProps<
  RootStackParamList,
  "DocumentDetail"
>;
export type ApDocumentScreenProps = NativeStackScreenProps<RootStackParamList, "ApDocument">;
export type NotificationsStackProps = NativeStackScreenProps<RootStackParamList, "Notifications">;

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;
export type ApScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "AP">,
  NativeStackScreenProps<RootStackParamList>
>;
export type QueueScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Queue">,
  NativeStackScreenProps<RootStackParamList>
>;
export type MoreScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "More">,
  NativeStackScreenProps<RootStackParamList>
>;
export type NotificationsScreenProps = NotificationsStackProps;
