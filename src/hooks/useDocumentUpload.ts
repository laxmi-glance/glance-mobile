import { useCallback, useState } from "react";
import { Alert } from "react-native";
import documentService from "../services/document.service";
import { apiErrorMessage } from "../utils/errors";
import { promptUploadSource } from "../utils/pickUpload";

export function useDocumentUpload(onSuccess?: () => void) {
  const [uploading, setUploading] = useState(false);

  const upload = useCallback(() => {
    promptUploadSource(async (files) => {
      setUploading(true);
      try {
        const result = await documentService.uploadDocuments(files);
        Alert.alert("Upload complete", result.message || "Documents queued for processing.");
        onSuccess?.();
      } catch (error: unknown) {
        Alert.alert("Upload failed", apiErrorMessage(error));
      } finally {
        setUploading(false);
      }
    });
  }, [onSuccess]);

  return { uploading, upload };
}
