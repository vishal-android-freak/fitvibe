/**
 * Attachment pickers for the chat composer. Produces ChatAttachment[] (base64),
 * compressing images first. Images go to the model natively; text files have
 * their contents sent. Multiple selections supported.
 *
 * The picker modules are NATIVE (expo-image-picker / -document-picker /
 * -image-manipulator) and only exist in a dev/standalone build. We import them
 * LAZILY so the chat screen still loads in a build that lacks them — attachments
 * just degrade to a no-op (see `attachmentsAvailable`).
 */

import type { ChatAttachment } from '@/data/vaidya';

const MAX_IMAGE_DIM = 1280; // resize longest edge before base64 (keep payload sane)
const TEXT_EXT = /\.(txt|md|markdown|csv|json|log|ya?ml|tsx?|jsx?|py|go|java|c|cpp|sh|sql|html?|css)$/i;

/** True when the native picker modules are present (a dev/standalone build). */
export function attachmentsAvailable(): boolean {
  try {
    require('expo-image-picker');
    return true;
  } catch {
    return false;
  }
}

/** Compress + base64-encode an image URI into a ChatAttachment. */
async function imageToAttachment(uri: string): Promise<ChatAttachment> {
  const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
  const result = await manipulateAsync(uri, [{ resize: { width: MAX_IMAGE_DIM } }], {
    compress: 0.7,
    format: SaveFormat.JPEG,
    base64: true,
  });
  return { kind: 'image', mimeType: 'image/jpeg', data: result.base64 ?? '' };
}

/** Pick one or more images from the gallery. */
export async function pickImages(): Promise<ChatAttachment[]> {
  const ImagePicker = await import('expo-image-picker');
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: 6,
    quality: 1,
  });
  if (res.canceled) return [];
  return Promise.all(res.assets.map((a) => imageToAttachment(a.uri)));
}

/** Capture a photo with the camera. */
export async function captureImage(): Promise<ChatAttachment[]> {
  const ImagePicker = await import('expo-image-picker');
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return [];
  const res = await ImagePicker.launchCameraAsync({ quality: 1 });
  if (res.canceled) return [];
  return Promise.all(res.assets.map((a) => imageToAttachment(a.uri)));
}

/** Pick files. Text-readable files send their contents (base64 from the picker,
 *  decoded server-side); image files are routed through image compression. */
export async function pickFiles(): Promise<ChatAttachment[]> {
  const DocumentPicker = await import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({
    multiple: true,
    copyToCacheDirectory: true,
    base64: true,
  });
  if (res.canceled) return [];
  const out: ChatAttachment[] = [];
  for (const a of res.assets) {
    const isText = (a.mimeType?.startsWith('text/') ?? false) || TEXT_EXT.test(a.name ?? '');
    if (isText && a.base64) {
      out.push({ kind: 'text', mimeType: a.mimeType ?? 'text/plain', name: a.name, data: a.base64 });
    } else if (a.mimeType?.startsWith('image/')) {
      out.push(await imageToAttachment(a.uri));
    }
    // Non-text, non-image files are skipped for v1 (images + text files only).
  }
  return out;
}
