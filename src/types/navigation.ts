import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Login: undefined;
  CompanySelection: undefined;
  ProcessingQueue: undefined;
  DocumentDetail: { documentId: number };
};

export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type CompanySelectionScreenProps = NativeStackScreenProps<RootStackParamList, 'CompanySelection'>;
export type ProcessingQueueScreenProps = NativeStackScreenProps<RootStackParamList, 'ProcessingQueue'>;
export type DocumentDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'DocumentDetail'>;
