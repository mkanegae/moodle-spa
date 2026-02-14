import { useState, useEffect } from 'react';
import { bffClient } from '../services/bffClient';

// メモリキャッシュ（セッション中は保持）
const imageCache = new Map<string, string>();

interface UseCourseImageResult {
  imageSrc: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * Moodleコース画像をBase64で取得するカスタムフック
 * @param imageUrl - Moodleの画像URL（courseimage または overviewfiles[0].fileurl）
 * @param fallbackColor - 画像がない場合のフォールバック背景色
 */
export function useCourseImage(
  imageUrl: string | undefined | null,
  fallbackColor?: string
): UseCourseImageResult {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setImageSrc(null);
      setLoading(false);
      return;
    }

    // キャッシュをチェック
    if (imageCache.has(imageUrl)) {
      setImageSrc(imageCache.get(imageUrl)!);
      setLoading(false);
      return;
    }

    // AbortControllerでタイムアウト制御
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒タイムアウト

    const fetchImage = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await bffClient.getCourseImage(imageUrl);

        // AbortされていたらキャンセルされたためStateを更新しない
        if (controller.signal.aborted) return;

        // レスポンスから画像データを取得（文字列またはオブジェクト形式に対応）
        let base64Data: string;
        if (typeof response === 'string') {
          base64Data = response;
        } else if (response && typeof response === 'object') {
          // オブジェクト形式の場合、imageUrl, data, image, base64 などのキーを探す
          base64Data = response.imageUrl || response.data || response.image || response.base64 || '';
        } else {
          throw new Error('Invalid response format');
        }

        if (!base64Data) {
          throw new Error('No image data received');
        }

        // Base64データをdata URLに変換（既にdata:で始まっている場合はそのまま使用）
        const dataUrl = base64Data.startsWith('data:')
          ? base64Data
          : `data:image/jpeg;base64,${base64Data}`;

        // キャッシュに保存
        imageCache.set(imageUrl, dataUrl);
        setImageSrc(dataUrl);
      } catch (err: any) {
        // AbortされていたらStateを更新しない
        if (controller.signal.aborted) return;

        console.error('Failed to fetch course image:', err);
        setError(err.message || 'Failed to load image');
        setImageSrc(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchImage();

    // クリーンアップ
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [imageUrl]);

  return { imageSrc, loading, error };
}

/**
 * 画像キャッシュをクリア
 */
export function clearImageCache(): void {
  imageCache.clear();
}

export default useCourseImage;
