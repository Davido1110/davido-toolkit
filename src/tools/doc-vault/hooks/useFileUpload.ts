import { useState, useCallback } from 'react';
import { saveFile } from '../lib/localFileStore';

interface UploadResult {
  storagePath: string;
  downloadURL: string; // "local:{storagePath}"
}

interface UseFileUploadResult {
  upload: (file: File, path: string) => Promise<UploadResult>;
  uploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

export function useFileUpload(): UseFileUploadResult {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  const upload = useCallback(async (file: File, path: string): Promise<UploadResult> => {
    setUploading(true);
    setProgress(0);
    setError(null);
    try {
      setProgress(50);
      await saveFile(path, file);
      setProgress(100);
      setUploading(false);
      return { storagePath: path, downloadURL: `local:${path}` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Lỗi lưu file';
      setError(msg);
      setUploading(false);
      throw err;
    }
  }, []);

  return { upload, uploading, progress, error, reset };
}
