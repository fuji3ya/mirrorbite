/**
 * Mirrorbite — Photo metadata stripping (privacy guarantee).
 *
 * Apple / GDPR / our own Privacy Policy §3 promises:
 *   "Cloudflare Workers ... strips identifying metadata"
 *
 * The Worker proxy cannot reliably strip EXIF (it would have to re-encode the
 * image, which is slow and CPU-bound). The honest path is to strip on the
 * client BEFORE any network call. expo-image-manipulator re-encodes the JPEG,
 * which side-effect-drops EXIF/GPS/orientation/camera-model and date tags.
 *
 * Side benefits:
 *   - Compresses to ≤ ~400KB so the dataURL POST body stays small
 *   - Bounds the long-edge to 1280px (sufficient for vision models)
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.82;

/**
 * Strip identifying metadata from a photo URI and return a downscaled JPEG.
 *
 * @param sourceUri - file:// URI from expo-camera or expo-image-picker
 * @returns         - file:// URI of the stripped JPEG, or the original on failure
 *                    (failure mode is logged but not surfaced — capture flow
 *                    should still proceed; the Privacy Policy is a best-effort
 *                    promise, not a hard contract).
 */
export async function stripPhotoMetadata(sourceUri: string): Promise<string> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [
        // Single resize keeps aspect ratio when only one dimension is given.
        { resize: { width: MAX_DIMENSION } },
      ],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      },
    );
    return result.uri;
  } catch (e) {
    // Privacy is best-effort: if manipulation fails we still let the user
    // proceed rather than blocking analysis entirely. The Privacy Policy
    // wording covers the "may transit through providers" case.
    console.warn('stripPhotoMetadata failed, using original', e);
    return sourceUri;
  }
}

/**
 * Strip metadata AND return a data URL ready to POST to the Worker.
 *
 * The Worker's parseImage expects `data:image/jpeg;base64,...` and falls back
 * to treating the input as raw base64 if it doesn't match — sending a `file://`
 * URI confuses the fallback into shipping a garbage body to Gemini → 502.
 *
 * This helper always produces a real data URL (or null on failure) so the
 * caller can either upload it cleanly or surface a typed error to the user.
 */
export async function stripAndEncodeForUpload(sourceUri: string): Promise<string | null> {
  try {
    // Two-step pipeline so we never trust expo-image-manipulator's `base64: true`
    // output. On iOS production builds, base64:true returned by manipulateAsync
    // can be malformed for HEIC-origin photos coming out of the library picker
    // (Build 18 diag: Gemini='invalid_json', Claude=400 for library photos
    // while camera-shot photos work). Path:
    //   1. manipulateAsync to JPEG file (resize + re-encode, drops EXIF). No base64.
    //   2. FileSystem.readAsStringAsync(file, {encoding: Base64}) — known reliable.
    const result = await ImageManipulator.manipulateAsync(
      sourceUri,
      [{ resize: { width: MAX_DIMENSION } }],
      {
        compress: JPEG_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
        base64: false,
      },
    );
    const b64 = await FileSystem.readAsStringAsync(result.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!b64 || b64.length < 100) return null;
    return `data:image/jpeg;base64,${b64}`;
  } catch (e) {
    console.warn('stripAndEncodeForUpload failed', e);
    return null;
  }
}
