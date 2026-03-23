import React, { useCallback, useMemo, useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import type { UploadDocumentScreenProps } from '../types/navigation';
import documentService from '../services/document.service';
import { DOCUMENT_TYPE_OPTIONS, type DocumentTypeValue, labelForDocumentType } from '../constants/documentTypes';
import { MAX_UPLOAD_BYTES, prepareImageForUpload } from '../utils/prepareImageForUpload';
import { useTheme } from '../theme';

const SOFT_SIZE_BYTES = 5 * 1024 * 1024;

export default function UploadDocumentScreen({ navigation }: UploadDocumentScreenProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [preparedUri, setPreparedUri] = useState<string | null>(null);
  const [sizeBytes, setSizeBytes] = useState<number>(0);
  const [documentType, setDocumentType] = useState<DocumentTypeValue>('purchase_invoice');
  const [notes, setNotes] = useState('');
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ loaded: number; total: number } | null>(null);

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

  const renderTypeRow = useCallback(
    ({ item }: { item: (typeof DOCUMENT_TYPE_OPTIONS)[number] }) => (
      <TouchableOpacity
        style={styles.typeRow}
        onPress={() => {
          setDocumentType(item.value);
          setTypeModalVisible(false);
        }}
      >
        <Text style={styles.typeRowText}>{item.label}</Text>
        {documentType === item.value ? <Text style={styles.typeCheck}>✓</Text> : null}
      </TouchableOpacity>
    ),
    [documentType]
  );

  const progressPct =
    progress && progress.total > 0 ? Math.round((100 * progress.loaded) / progress.total) : null;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.hint}>Capture or pick one image. It is resized and compressed before upload (max{' '}
        {MAX_UPLOAD_BYTES / (1024 * 1024)} MB).</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.secondaryBtn, styles.secondaryBtnSpacing]}
            onPress={takePhoto}
            disabled={preparing || uploading}
          >
            <Text style={styles.secondaryBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary} disabled={preparing || uploading}>
            <Text style={styles.secondaryBtnText}>Gallery</Text>
          </TouchableOpacity>
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

        <Text style={styles.label}>Document type</Text>
        <TouchableOpacity
          style={styles.selectField}
          onPress={() => setTypeModalVisible(true)}
          disabled={uploading}
        >
          <Text style={styles.selectValue}>{labelForDocumentType(documentType)}</Text>
          <Text style={styles.chevron}>▼</Text>
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

        <TouchableOpacity
          style={[styles.primaryBtn, (!preparedUri || uploading) && styles.primaryBtnDisabled]}
          onPress={submit}
          disabled={!preparedUri || uploading}
        >
          {uploading ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text style={styles.primaryBtnText}>Upload document</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={typeModalVisible} animationType="slide" transparent>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={() => setTypeModalVisible(false)} />
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Document type</Text>
            <FlatList
              data={[...DOCUMENT_TYPE_OPTIONS]}
              keyExtractor={(i) => i.value}
              renderItem={renderTypeRow}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
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
    paddingVertical: theme.spacing[3],
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.primaryAccent,
    alignItems: 'center',
  },
    secondaryBtnText: {
      color: theme.colors.primaryAccent,
      fontWeight: theme.typography.weight.semibold,
      fontSize: theme.typography.size.body,
      fontFamily: theme.typography.fontFamilyPrimary,
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
      marginTop: theme.spacing[1] + 2,
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
    paddingHorizontal: theme.spacing[3] + 2,
    paddingVertical: theme.spacing[3] + 2,
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
    backgroundColor: theme.colors.primaryAccent,
    paddingVertical: theme.spacing[4],
    borderRadius: theme.radius.lg,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnText: {
      color: theme.colors.onPrimary,
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.semibold,
      fontFamily: theme.typography.fontFamilyPrimary,
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
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3] + 2,
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
