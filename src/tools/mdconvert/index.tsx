import { useState } from 'react';

const MDCONVERT_URL = 'http://localhost:2023';

export default function MdConvert() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Running at <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">{MDCONVERT_URL}</code>
        </div>
        <a
          href={MDCONVERT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline"
        >
          Open in new tab ↗
        </a>
      </div>

      {/* iframe or error state — fill remaining viewport height */}
      <div className="relative" style={{ height: 'calc(100vh - 9rem)' }}>
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
            <span className="text-5xl">📄</span>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
                mdconvert is not running
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Start the service with Docker, then refresh this page.
              </p>
              <pre className="text-left text-xs bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-3 inline-block text-gray-700 dark:text-gray-300">
{`cd ~/Documents/mdconvert
cp .env.example .env   # fill in secrets first
docker compose up -d`}
              </pre>
            </div>
            <button
              onClick={() => { setHasError(false); setIsLoading(true); }}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-10">
                <div className="flex flex-col items-center gap-3 text-gray-400">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Connecting to mdconvert…</span>
                </div>
              </div>
            )}
            <iframe
              src={MDCONVERT_URL}
              className="w-full h-full border-0"
              title="mdconvert"
              onLoad={() => setIsLoading(false)}
              onError={() => { setIsLoading(false); setHasError(true); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
