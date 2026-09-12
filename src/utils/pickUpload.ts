import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import type { LocalUploadFile } from "../services/document.service";

function guessName(uri: string, fallback: string): string {
  const last = uri.split("/").pop();
  return last && last.includes(".") ? last : fallback;
}

export async function pickFromLibrary(): Promise<LocalUploadFile[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photos permission needed",
      "Allow photo library access to upload invoices and receipts."
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsMultipleSelection: true,
    quality: 0.8,
    selectionLimit: 10,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets.map((asset, index) => ({
    uri: asset.uri,
    name: asset.fileName || guessName(asset.uri, `photo-${Date.now()}-${index}.jpg`),
    mimeType: asset.mimeType || "image/jpeg",
  }));
}

export async function pickDocuments(): Promise<LocalUploadFile[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/pdf", "image/*"],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) {
    return null;
  }

  return result.assets.slice(0, 10).map((asset) => ({
    uri: asset.uri,
    name: asset.name || guessName(asset.uri, `document-${Date.now()}.pdf`),
    mimeType: asset.mimeType || "application/octet-stream",
  }));
}
