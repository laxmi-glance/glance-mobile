import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import type { UploadDocumentScreenProps } from '../types/navigation';
import documentService from '../services/document.service';
import { type DocumentTypeValue } from '../constants/documentTypes';
import { MAX_UPLOAD_BYTES, prepareImageForUpload } from '../utils/prepareImageForUpload';
import { useTheme } from '../theme';
import AppButton from '../components/common/AppButton';

const SOFT_SIZE_BYTES = 5 * 1024 * 1024;

type SelectOption = { value: string; label: string };

export default function UploadDocumentScreen({ navigation }: UploadDocumentScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [preparedUri, setPreparedUri] = useState<string | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number>(0);
  const [documentType, setDocumentType] = useState<DocumentTypeValue>('purchase_invoice');
  const [notes, setNotes] = useState('');
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseSearch, setExpenseSearch] = useState('');
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [paymentOptions, setPaymentOptions] = useState<SelectOption[]>([]);
  const [expenseOptions, setExpenseOptions] = useState<SelectOption[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SelectOption | null>(null);
  const [selectedExpenseHead, setSelectedExpenseHead] = useState<SelectOption | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadLedgerOptions = async () => {
      setLedgerLoading(true);
      try {
        const groups = await documentService.getLedgerAccountsByGroups();
        if (!mounted) {
          return;
        }

        const bankAccounts =
          groups.find((group) => group.label?.toLowerCase() === 'bank accounts')?.options ?? [];
        const expenseAccounts =
          groups.find((group) => group.label?.toLowerCase() === 'expense')?.options ?? [];

        setPaymentOptions(
          bankAccounts.map((account) => ({
            value: String(account.id),
            label: account.title,
          }))
        );
        setExpenseOptions(
          expenseAccounts.map((account) => ({
            value: String(account.id),
            label: `${account.title}${account.statutory_code ? ` (${account.statutory_code})` : ''}`,
          }))
        );
      } catch {
        if (mounted) {
          Alert.alert('Unable to load options', 'Payment method and expense head options could not be loaded.');
        }
      } finally {
        if (mounted) {
          setLedgerLoading(false);
        }
      }
    };

    loadLedgerOptions();
    return () => {
      mounted = false;
    };
  }, []);

  const resetImage = () => {
    setPreparedUri(null);
    setSizeBytes(0);
    setProgress(null);
  };

  const runPrepare = async (uri: string) => {
    setPreparing(true);
    setProgress(null);
    try {
      const { uri: outUri, sizeBytes: sz } = await prepareImageForUpload(uri);
      setPreparedUri(outUri);
      setSizeBytes(sz);
      if (sz > SOFT_SIZE_BYTES) {
        Alert.alert(
          'Large file',
          `This image is ${(sz / (1024 * 1024)).toFixed(1)} MB after compression. Upload may take longer on slow networks.`,
          [{ text: 'OK' }]
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not prepare image.';
      Alert.alert('Image error', msg);
      resetImage();
    } finally {
      setPreparing(false);
    }
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required to select a document.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    await runPrepare(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Camera access is required to capture a document.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) {
      return;
    }
    await runPrepare(result.assets[0].uri);
  };

  const submit = async () => {
    if (!preparedUri) {
      Alert.alert('No document', 'Choose or capture an image first.');
      return;
    }

    setUploading(true);
    setProgress(null);
    try {
      const data = await documentService.uploadFinancialDocument(
        {
          uri: preparedUri,
          name: `document-${Date.now()}.jpg`,
          type: 'image/jpeg',
        },
        {
          documentType,
          notes: notes.trim() || undefined,
          paymentMethodId: selectedPaymentMethod?.value,
          expenseHeadId: selectedExpenseHead?.value,
        },
        (p) => setProgress(p)
      );

      const success = (data.success_count ?? 0) > 0;
      const dupOnly =
        (data.duplicate_count ?? 0) > 0 && !success && !(data.error_count ?? 0);
      if (dupOnly) {
        Alert.alert('Duplicate', data.message ?? 'This file was already uploaded.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (data.errors?.length && !success) {
        Alert.alert('Upload failed', data.errors.join('\n') || data.detail || 'Unknown error');
        return;
      }

      Alert.alert('Success', data.message ?? 'Document uploaded. Processing has started.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: unknown) {
      const ax = err as {
        response?: {
          status?: number;
          data?: {
            detail?: string;
            message?: string;
            errors?: string[];
          };
        };
      };
      const status = ax.response?.status;
      const body = ax.response?.data;

      if (status === 409 && body) {
        Alert.alert('Duplicate', body.message ?? 'This file was already uploaded.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      const detail =
        (typeof body?.detail === 'string' && body.detail) ||
        (typeof body?.message === 'string' && body.message) ||
        (Array.isArray(body?.errors) ? body.errors.join('\n') : null) ||
        'Please try again.';
      Alert.alert('Upload failed', detail);
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const filteredExpenseOptions = useMemo(() => {
    const search = expenseSearch.trim().toLowerCase();
    if (!search) {
      return expenseOptions;
    }
    return expenseOptions.filter((item) => item.label.toLowerCase().includes(search));
  }, [expenseOptions, expenseSearch]);

  const progressPct =
    progress && progress.total > 0 ? Math.round((100 * progress.loaded) / progress.total) : null;
  const cameraButtonStyle = [styles.secondaryBtn, styles.secondaryBtnSpacing];
  const paymentValueStyle = [
    styles.selectValue,
    !selectedPaymentMethod ? styles.selectPlaceholder : null,
  ];
  const expenseValueStyle = [
    styles.selectValue,
    !selectedExpenseHead ? styles.selectPlaceholder : null,
  ];
  const noneOptionTextStyle = [styles.typeRowText, styles.selectPlaceholder];

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.9}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Upload Document</Text>
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.hint}>Capture or pick one image. It is resized and compressed before upload (max{' '}
          {MAX_UPLOAD_BYTES / (1024 * 1024)} MB).</Text>

        <View style={styles.actionsRow}>
          <AppButton
            label="Camera"
            variant="outline"
            onPress={takePhoto}
            disabled={preparing || uploading}
            style={cameraButtonStyle}
          />
          <AppButton
            label="Gallery"
            variant="outline"
            onPress={pickFromLibrary}
            disabled={preparing || uploading}
            style={styles.secondaryBtn}
          />
        </View>

        {preparing ? (
          <View style={styles.centerPad}>
            <ActivityIndicator size="large" color={theme.colors.primaryAccent} />
            <Text style={styles.muted}>Optimizing image…</Text>
          </View>
        ) : null}

        {preparedUri ? (
          <View style={styles.previewBox}>
            <Image source={{ uri: preparedUri }} style={styles.preview} resizeMode="contain" />
            <Text style={styles.meta}>
              Size: {(sizeBytes / 1024).toFixed(0)} KB
            </Text>
            <TouchableOpacity onPress={resetImage} disabled={uploading}>
              <Text style={styles.clearLink}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <Text style={styles.label}>Payment Method (Optional)</Text>
        <TouchableOpacity
          style={styles.selectField}
          onPress={() => setPaymentModalVisible(true)}
          disabled={uploading || ledgerLoading}
        >
          <Text style={paymentValueStyle}>
            {selectedPaymentMethod?.label ?? 'Select payment method...'}
          </Text>
          {ledgerLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primaryAccent} />
          ) : (
            <Text style={styles.chevron}>▼</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Expense Head (Optional)</Text>
        <TouchableOpacity
          style={styles.selectField}
          onPress={() => setExpenseModalVisible(true)}
          disabled={uploading || ledgerLoading}
        >
          <Text style={expenseValueStyle}>
            {selectedExpenseHead?.label ?? 'Search and select expense head...'}
          </Text>
          {ledgerLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primaryAccent} />
          ) : (
            <Text style={styles.chevron}>▼</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={styles.notes}
          placeholder="Add context for approvers…"
          placeholderTextColor={theme.colors.textMuted}
          value={notes}
          onChangeText={setNotes}
          multiline
          editable={!uploading}
        />

        {uploading && progressPct != null ? (
          <Text style={styles.progressText}>Uploading… {progressPct}%</Text>
        ) : null}

          <AppButton
            label="Upload document"
            variant="primary"
            onPress={submit}
            loading={uploading}
            disabled={!preparedUri || uploading}
            style={styles.primaryBtn}
          />
        </ScrollView>

        <Modal visible={paymentModalVisible} animationType="slide" transparent>
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => setPaymentModalVisible(false)} />
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Payment Method (Optional)</Text>
              <TouchableOpacity
                style={styles.typeRow}
                onPress={() => {
                  setSelectedPaymentMethod(null);
                  setPaymentModalVisible(false);
                }}
              >
                <Text style={noneOptionTextStyle}>None</Text>
                {!selectedPaymentMethod ? <Text style={styles.typeCheck}>✓</Text> : null}
              </TouchableOpacity>
              <FlatList
                data={paymentOptions}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.typeRow}
                    onPress={() => {
                      setSelectedPaymentMethod(item);
                      setPaymentModalVisible(false);
                    }}
                  >
                    <Text style={styles.typeRowText}>{item.label}</Text>
                    {selectedPaymentMethod?.value === item.value ? <Text style={styles.typeCheck}>✓</Text> : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>

        <Modal visible={expenseModalVisible} animationType="slide" transparent>
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalBackdrop}
              onPress={() => {
                setExpenseModalVisible(false);
                setExpenseSearch('');
              }}
            />
            <View style={styles.modalSheet}>
              <Text style={styles.modalTitle}>Expense Head (Optional)</Text>
              <TextInput
                value={expenseSearch}
                onChangeText={setExpenseSearch}
                placeholder="Search and select expense head..."
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
              />
              <TouchableOpacity
                style={styles.typeRow}
                onPress={() => {
                  setSelectedExpenseHead(null);
                  setExpenseSearch('');
                  setExpenseModalVisible(false);
                }}
              >
                <Text style={noneOptionTextStyle}>None</Text>
                {!selectedExpenseHead ? <Text style={styles.typeCheck}>✓</Text> : null}
              </TouchableOpacity>
              <FlatList
                data={filteredExpenseOptions}
                keyExtractor={(item) => item.value}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.typeRow}
                    onPress={() => {
                      setSelectedExpenseHead(item);
                      setExpenseSearch('');
                      setExpenseModalVisible(false);
                    }}
                  >
                    <Text style={styles.typeRowText}>{item.label}</Text>
                    {selectedExpenseHead?.value === item.value ? <Text style={styles.typeCheck}>✓</Text> : null}
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing[4],
      paddingVertical: theme.spacing[3],
      backgroundColor: theme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backIconButton: {
      width: theme.button.height,
      height: theme.button.height,
      borderRadius: theme.button.radius,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surface,
      marginRight: theme.spacing[3],
    },
    title: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    scroll: { padding: theme.spacing[4], paddingBottom: theme.spacing[8] },
    hint: {
      fontSize: theme.typography.size.small,
      color: theme.colors.textMuted,
      marginBottom: theme.spacing[4],
      lineHeight: 20,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    actionsRow: { flexDirection: 'row', marginBottom: theme.spacing[4] },
  secondaryBtnSpacing: {
    marginRight: theme.spacing[3],
  },
  secondaryBtn: {
    flex: 1,
  },
    centerPad: { alignItems: 'center', paddingVertical: theme.spacing[4] },
    muted: {
      marginTop: theme.spacing[2],
      color: theme.colors.textMuted,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    previewBox: { marginBottom: theme.spacing[4], alignItems: 'center' },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surfaceElevated,
  },
    meta: {
      marginTop: theme.spacing[2],
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    clearLink: {
      marginTop: theme.spacing[2],
      color: theme.colors.error,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    label: {
      fontSize: theme.typography.size.small,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing[2],
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    marginBottom: theme.spacing[4],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
    selectValue: {
      fontSize: theme.typography.size.body,
      color: theme.colors.textPrimary,
      flex: 1,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    selectPlaceholder: {
      color: theme.colors.textMuted,
    },
    chevron: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  notes: {
    minHeight: 88,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing[3],
    marginBottom: theme.spacing[5],
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: theme.typography.size.body,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamilyPrimary,
    ...Platform.select({
      android: { textAlignVertical: 'top' as const },
      default: {},
    }),
  },
    progressText: {
      textAlign: 'center',
      marginBottom: theme.spacing[3],
      color: theme.colors.primaryAccent,
      fontWeight: theme.typography.weight.semibold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  primaryBtn: {
    minHeight: 44,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.overlay,
  },
  modalSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    maxHeight: '70%',
    paddingBottom: theme.spacing[6],
  },
  modalTitle: {
    fontSize: theme.typography.size.lg,
    fontWeight: theme.typography.weight.bold,
    padding: theme.spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    color: theme.colors.textPrimary,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  searchInput: {
    minHeight: 42,
    marginHorizontal: theme.spacing[4],
    marginVertical: theme.spacing[3],
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[3],
    color: theme.colors.textPrimary,
    fontSize: theme.typography.size.body,
    fontFamily: theme.typography.fontFamilyPrimary,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
    typeRowText: {
      fontSize: theme.typography.size.body,
      color: theme.colors.textPrimary,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
    typeCheck: {
      fontSize: theme.typography.size.lg,
      color: theme.colors.primaryAccent,
      fontWeight: theme.typography.weight.bold,
      fontFamily: theme.typography.fontFamilyPrimary,
    },
  });
