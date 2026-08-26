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
  Queue: undefined;
  Scanner: undefined;
  Report: { reportId: string };
};

export type MainTabParamList = {
  Home: undefined;
  AP: undefined;
  Scan: undefined;
  Reports: undefined;
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
export type QueueScreenProps = NativeStackScreenProps<RootStackParamList, "Queue">;
export type ScannerScreenProps = NativeStackScreenProps<RootStackParamList, "Scanner">;
export type ReportScreenProps = NativeStackScreenProps<RootStackParamList, "Report">;

export type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<RootStackParamList>
>;
export type ApScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "AP">,
  NativeStackScreenProps<RootStackParamList>
>;
export type ReportsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Reports">,
  NativeStackScreenProps<RootStackParamList>
>;
export type MoreScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "More">,
  NativeStackScreenProps<RootStackParamList>
>;
export type NotificationsScreenProps = NotificationsStackProps;
