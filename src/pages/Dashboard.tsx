import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { TOOLS, CATEGORIES } from '@/config/tools';
import { useAuth } from '@/context/AuthContext';

export function Dashboard() {
  const [search, setSearch] = useState('');
  const { profile } = useAuth();

  const accessibleTools = useMemo(() => {
    if (!profile || profile.role === 'admin') return TOOLS;
    if (!profile.allowedTools) return TOOLS;
    return TOOLS.filter((t) => profile.allowedTools!.includes(t.id));
  }, [profile]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return accessibleTools;
    return accessibleTools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags?.some((tag) => tag.includes(q)),
    );
  }, [search, accessibleTools]);

  const grouped = useMemo(() => {
    const map: Record<string, typeof TOOLS> = {};
    for (const t of filtered) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return map;
  }, [filtered]);

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Davido Toolkit
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Free browser-only tools — all processing happens on your device, no data is sent anywhere.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-sm">
        <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search all tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500 placeholder:text-gray-400"
        />
      </div>

      {/* Tool groups */}
      {CATEGORIES.map((cat) => {
        const catTools = grouped[cat.id];
        if (!catTools?.length) return null;
        return (
          <div key={cat.id} className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>{cat.icon}</span> {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {catTools.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="group relative flex flex-col gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-brand-500 hover:shadow-md transition-all"
                >
                  {tool.badge && (
                    <span className="absolute top-3 right-3 text-[10px] font-bold px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded dark:bg-brand-900/40 dark:text-brand-300">
                      {tool.badge}
                    </span>
                  )}
                  <div className="text-2xl">{tool.icon}</div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white text-sm group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                      {tool.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {tool.description}
                    </div>
                  </div>
                  {tool.tags && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-1">
                      {tool.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}

      {search && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>No tools match "<strong>{search}</strong>"</p>
        </div>
      )}
    </div>
  );
}
