import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../types/navigation";
import { pickDocuments, pickFromLibrary } from "../utils/pickUpload";
import { UPLOAD_DENIED, useDocumentUpload } from "./useDocumentUpload";
import { useRbac } from "./useRbac";

const PICKER_DELAY_MS = 280;

export function useUploadSourceMenu() {
  const [visible, setVisible] = useState(false);
  const { canUpload, loading: rbacLoading } = useRbac();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const pickerGeneration = useRef(0);
  const goToQueue = useCallback(() => {
    navigation.navigate("Queue");
  }, [navigation]);
  const { uploadFiles, uploading } = useDocumentUpload(goToQueue);

  const invalidatePickers = useCallback(() => {
    pickerGeneration.current += 1;
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
  }, []);

  const close = useCallback(() => {
    invalidatePickers();
    setVisible(false);
  }, [invalidatePickers]);

  useEffect(() => {
    return () => {
      invalidatePickers();
    };
  }, [invalidatePickers]);

  useEffect(() => {
    if (!visible && !uploading) {
      return;
    }
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!uploading) {
        close();
      }
      return true;
    });
    return () => sub.remove();
  }, [close, uploading, visible]);

  const open = useCallback(() => {
    if (rbacLoading) {
      return;
    }
    if (!canUpload) {
      Alert.alert("Upload not allowed", UPLOAD_DENIED);
      return;
    }
    setVisible(true);
  }, [canUpload, rbacLoading]);

  const toggle = useCallback(() => {
    if (visible) {
      hide();
      return;
    }
    open();
  }, [hide, open, visible]);

  const pickCamera = useCallback(() => {
    hide();
    navigation.navigate("Scanner");
  }, [hide, navigation]);

  const runPicker = useCallback(
    async (picker: () => ReturnType<typeof pickFromLibrary>) => {
      const generation = pickerGeneration.current + 1;
      pickerGeneration.current = generation;
      setVisible(false);
      await new Promise((resolve) => {
        setTimeout(resolve, PICKER_DELAY_MS);
      });
      if (generation !== pickerGeneration.current) {
        return;
      }
      const files = await picker();
      if (generation !== pickerGeneration.current) {
        return;
      }
      if (files?.length) {
        await uploadFiles(files);
      }
    },
    [uploadFiles]
  );

  const pickPhotos = useCallback(() => {
    void runPicker(pickFromLibrary);
  }, [runPicker]);

  const pickFiles = useCallback(() => {
    void runPicker(pickDocuments);
  }, [runPicker]);

  return useMemo(
    () => ({
      visible,
      uploading,
      open,
      hide,
      close,
      toggle,
      pickCamera,
      pickPhotos,
      pickFiles,
    }),
    [close, hide, open, pickCamera, pickFiles, pickPhotos, toggle, uploading, visible]
  );
}

export type UploadSourceMenuState = ReturnType<typeof useUploadSourceMenu>;

export const UploadSourceContext = createContext<UploadSourceMenuState | null>(null);

export function useUploadSource() {
  const ctx = useContext(UploadSourceContext);
  if (!ctx) {
    throw new Error("useUploadSource must be used within UploadSourceProvider");
  }
  return ctx;
}
