import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Image } from 'react-native';

/** Hard cap aligned with product plan; backend allows up to 100 MB. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.78;

function getImageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (err) => reject(err)
    );
  });
}

/**
 * Resize longest edge to 1600px (when larger), compress to JPEG, enforce max size.
 */
export async function prepareImageForUpload(sourceUri: string): Promise<{ uri: string; sizeBytes: number }> {
  const { width: w, height: h } = await getImageSize(sourceUri);
  const landscape = w >= h;
  const actions: ImageManipulator.Action[] = [];
  if (landscape && w > MAX_EDGE_PX) {
    actions.push({ resize: { width: MAX_EDGE_PX } });
  } else if (!landscape && h > MAX_EDGE_PX) {
    actions.push({ resize: { height: MAX_EDGE_PX } });
  }

  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    actions,
    { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG }
  );

  const info = await FileSystem.getInfoAsync(manipulated.uri);
  const sizeBytes = info.exists && 'size' in info && typeof info.size === 'number' ? info.size : 0;

  if (sizeBytes > MAX_UPLOAD_BYTES) {
    const mb = (sizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`Image is still too large (${mb} MB) after compression. Max ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
  }

  return { uri: manipulated.uri, sizeBytes };
}
