import { useState } from 'react';
import { isLocalURL, downloadLocalFile } from '../lib/localFileStore';

interface Props {
  downloadURL: string;
  filename: string;
  className?: string;
  label?: string;
}

/**
 * Handles both local (IndexedDB) and remote (http) download URLs.
 * Local files are resolved from IndexedDB on-device; remote URLs open directly.
 */
export function DownloadButton({ downloadURL, filename, className, label = '↓ Tải xuống' }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (!downloadURL) return null;

  if (!isLocalURL(downloadURL)) {
    return (
      <a
        href={downloadURL}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }

  const handleLocalDownload = async () => {
    setBusy(true);
    setErr('');
    try {
      await downloadLocalFile(downloadURL, filename);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Không thể tải file');
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <button
        onClick={handleLocalDownload}
        disabled={busy}
        className={className}
        title="File được lưu trên thiết bị này"
      >
        {busy ? 'Đang tải...' : label}
      </button>
      {err && <span className="text-xs text-red-500">{err}</span>}
    </span>
  );
}
