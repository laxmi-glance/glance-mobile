import { useCallback, useState } from "react";
import { Alert } from "react-native";
import documentService, { type LocalUploadFile } from "../services/document.service";
import { apiErrorMessage } from "../utils/errors";
import { useRbac } from "./useRbac";

export const UPLOAD_DENIED = "Your role cannot upload documents in this workspace.";

export function useDocumentUpload(onSuccess?: () => void) {
  const { canUpload, loading: rbacLoading } = useRbac();
  const [uploading, setUploading] = useState(false);

  const uploadFiles = useCallback(
    async (files: LocalUploadFile[]) => {
      if (!files.length) {
        return false;
      }
      if (rbacLoading) {
        return false;
      }
      if (!canUpload) {
        Alert.alert("Upload not allowed", UPLOAD_DENIED);
        return false;
      }
      setUploading(true);
      try {
        const result = await documentService.uploadDocuments(files);
        Alert.alert("Upload complete", result.message || "Documents queued for processing.");
        onSuccess?.();
        return true;
      } catch (error: unknown) {
        Alert.alert("Upload failed", apiErrorMessage(error));
        return false;
      } finally {
        setUploading(false);
      }
    },
    [canUpload, onSuccess, rbacLoading]
  );

  return { uploading, uploadFiles, canUpload, rbacLoading };
}
