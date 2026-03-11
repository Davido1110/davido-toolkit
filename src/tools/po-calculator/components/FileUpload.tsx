import { useCallback, useState } from 'react';
import { useLang } from '../context/LangContext';

interface Props {
  onFile: (file: File) => void;
}

export function FileUpload({ onFile }: Props) {
  const { t } = useLang();
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      onFile(file);
    },
    [onFile],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
        handleFile(file);
      }
    },
    [handleFile],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={`
        relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
        ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}
      `}
    >
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={onInputChange}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
      <div className="flex flex-col items-center gap-3">
        {fileName ? (
          <>
            <span className="text-5xl">✅</span>
            <div>
              <p className="text-green-600 font-semibold">{fileName}</p>
              <p className="text-sm text-gray-500 mt-1">{t.clickReplace}</p>
            </div>
          </>
        ) : (
          <>
            <span className={`text-5xl transition-transform duration-150 ${dragging ? 'scale-125' : ''}`}>
              📂
            </span>
            <div>
              <p className="text-gray-700 dark:text-gray-200 font-semibold">{t.dropHere}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t.clickBrowse}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
