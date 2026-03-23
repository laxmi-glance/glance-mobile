import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  CompanySelection: undefined;
  ProcessingQueue: undefined;
  Notifications: undefined;
  ThemeSettings: undefined;
  UploadDocument: undefined;
  DocumentDetail: { documentId: string };
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type CompanySelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'CompanySelection'>;
export type ProcessingQueueScreenProps = NativeStackScreenProps<RootStackParamList, 'ProcessingQueue'>;
export type NotificationsScreenProps = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
export type ThemeSettingsScreenProps = NativeStackScreenProps<RootStackParamList, 'ThemeSettings'>;
export type DocumentDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'DocumentDetail'>;
export type UploadDocumentScreenProps = NativeStackScreenProps<RootStackParamList, 'UploadDocument'>;
