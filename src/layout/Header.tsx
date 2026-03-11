import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { TOOLS } from '@/config/tools';

interface Props {
  onMenuClick: () => void;
}

function useDark() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  );
  const toggle = () => {
    document.documentElement.classList.toggle('dark');
    setDark((d) => !d);
  };
  return { dark, toggle };
}

export function Header({ onMenuClick }: Props) {
  const { dark, toggle } = useDark();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const el = document.querySelector('main');
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 4);
    el.addEventListener('scroll', handler);
    return () => el.removeEventListener('scroll', handler);
  }, []);

  const currentTool = TOOLS.find((t) => t.path === location.pathname);

  return (
    <header
      className={`
        flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900
        border-b border-gray-200 dark:border-gray-800
        transition-shadow ${scrolled ? 'shadow-sm' : ''}
        sticky top-0 z-10
      `}
    >
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {currentTool ? (
          <div>
            <h1 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
              {currentTool.icon} {currentTool.name}
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
              {currentTool.description}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Welcome!</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Free, browser-only tools — no data leaves your device.
            </p>
          </div>
        )}
      </div>

      {/* Right: dark mode toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
