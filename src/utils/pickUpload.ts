import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Alert } from "react-native";
import type { LocalUploadFile } from "../services/document.service";

function guessName(uri: string, fallback: string): string {
  const last = uri.split("/").pop();
  return last && last.includes(".") ? last : fallback;
}

export async function pickFromCamera(): Promise<LocalUploadFile[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera permission needed",
      "Allow camera access to capture invoices and receipts."
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.[0]) {
    return null;
  }

  const asset = result.assets[0];
  return [
    {
      uri: asset.uri,
      name: asset.fileName || guessName(asset.uri, `scan-${Date.now()}.jpg`),
      mimeType: asset.mimeType || "image/jpeg",
    },
  ];
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

export function promptUploadSource(onPicked: (files: LocalUploadFile[]) => void): void {
  Alert.alert("Upload document", "Choose a source", [
    {
      text: "Camera",
      onPress: async () => {
        const files = await pickFromCamera();
        if (files?.length) {
          onPicked(files);
        }
      },
    },
    {
      text: "Photo library",
      onPress: async () => {
        const files = await pickFromLibrary();
        if (files?.length) {
          onPicked(files);
        }
      },
    },
    {
      text: "Files (PDF)",
      onPress: async () => {
        const files = await pickDocuments();
        if (files?.length) {
          onPicked(files);
        }
      },
    },
    { text: "Cancel", style: "cancel" },
  ]);
}
