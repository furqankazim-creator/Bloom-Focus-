import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export type ImagePurpose = 'puzzle' | 'worksheet' | 'picture';

const SIZE: Record<ImagePurpose, number> = {
  // Square, so pieces cut evenly.
  puzzle: 720,
  // Wide enough to read printed text on a worksheet.
  worksheet: 1000,
  // Small tiles in Find it.
  picture: 240,
};

/**
 * Lets the therapist pick or take a photo for a studio game. The picture is resized and stored
 * as a JPEG data URI so it survives reloads on web and phones. Returns null if cancelled.
 */
export async function pickStudioImage(purpose: ImagePurpose, source: 'library' | 'camera'): Promise<string | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) throw new Error('Camera access is off. Turn it on in Settings.');
  } else if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) throw new Error('Photo access is off. Turn it on in Settings.');
  }
  const square = purpose !== 'worksheet';
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    ...(square ? { aspect: [1, 1] as [number, number] } : {}),
    quality: 1,
  };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  const asset = res.canceled ? null : res.assets?.[0];
  if (!asset) return null;

  const max = SIZE[purpose];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if (square) {
    // Centre-crop to a square when the editor didn't (e.g. on web), so puzzle pieces aren't stretched.
    const side = Math.min(asset.width, asset.height);
    if (side > 0 && asset.width !== asset.height) {
      ctx.crop({ originX: (asset.width - side) / 2, originY: (asset.height - side) / 2, width: side, height: side });
    }
    ctx.resize({ width: max, height: max });
  } else if (asset.width > max) {
    ctx.resize({ width: max });
  }
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ compress: purpose === 'worksheet' ? 0.75 : 0.7, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) throw new Error('Could not read that picture. Please try another one.');
  return `data:image/jpeg;base64,${out.base64}`;
}
