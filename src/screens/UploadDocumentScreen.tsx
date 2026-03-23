import React, { useCallback, useState } from 'react';
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

const SOFT_SIZE_BYTES = 5 * 1024 * 1024;

export default function UploadDocumentScreen({ navigation }: UploadDocumentScreenProps) {
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
            <ActivityIndicator size="large" color="#007AFF" />
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
          {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Upload document</Text>}
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

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { padding: 16, paddingBottom: 32 },
  hint: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', marginBottom: 16 },
  secondaryBtnSpacing: {
    marginRight: 12,
  },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#007AFF', fontWeight: '600', fontSize: 16 },
  centerPad: { alignItems: 'center', paddingVertical: 16 },
  muted: { marginTop: 8, color: '#888' },
  previewBox: { marginBottom: 16, alignItems: 'center' },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#e8e8e8',
  },
  meta: { marginTop: 8, fontSize: 13, color: '#666' },
  clearLink: { marginTop: 6, color: '#FF3B30', fontSize: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectValue: { fontSize: 16, color: '#111', flex: 1 },
  chevron: { fontSize: 12, color: '#888' },
  notes: {
    minHeight: 88,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    ...Platform.select({
      android: { textAlignVertical: 'top' as const },
      default: {},
    }),
  },
  progressText: { textAlign: 'center', marginBottom: 12, color: '#007AFF', fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  typeRowText: { fontSize: 16, color: '#111' },
  typeCheck: { fontSize: 18, color: '#007AFF', fontWeight: '700' },
});
