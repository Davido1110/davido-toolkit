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
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="mb-10 animate-oat-in">
        <h1
          className="font-anton uppercase text-oat-black leading-none mb-2"
          style={{ fontSize: 'clamp(48px, 8vw, 96px)', lineHeight: 0.9 }}
        >
          Davido<br />Toolkit
        </h1>
        <p className="text-oat-black/50 text-sm font-sans mt-4 max-w-sm">
          Free browser-only tools — all processing happens on your device, no data is sent anywhere.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-10 max-w-sm animate-oat-in" style={{ animationDelay: '80ms' }}>
        <svg className="absolute left-3 top-3 w-4 h-4 text-oat-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search all tools…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border-2 border-oat-black bg-white text-oat-black text-sm font-sans focus:outline-none focus:ring-2 focus:ring-oat-yellow placeholder:text-oat-black/30"
        />
      </div>

      {/* Tool groups */}
      {CATEGORIES.map((cat, catIdx) => {
        const catTools = grouped[cat.id];
        if (!catTools?.length) return null;
        return (
          <div
            key={cat.id}
            className="mb-10 animate-oat-in"
            style={{ animationDelay: `${(catIdx + 2) * 80}ms` }}
          >
            <h2 className="font-anton text-oat-black uppercase tracking-widest text-sm mb-4 flex items-center gap-2">
              <span>{cat.icon}</span> {cat.label}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {catTools.map((tool) => (
                <Link
                  key={tool.id}
                  to={tool.path}
                  className="group relative flex flex-col gap-2 p-4 bg-white border-2 border-oat-black hover:border-oat-red transition-colors"
                >
                  {tool.badge && (
                    <span
                      className="sticker absolute top-3 right-3"
                      style={{
                        transform: 'rotate(-2deg)',
                        ...(tool.badge === 'New' ? {} : { background: '#D0302A', color: '#F5F2EC' }),
                      }}
                    >
                      {tool.badge}
                    </span>
                  )}
                  <div className="text-2xl">{tool.icon}</div>
                  <div>
                    <div className="font-anton uppercase text-oat-black text-base leading-tight group-hover:text-oat-red transition-colors">
                      {tool.name}
                    </div>
                    <div className="text-xs text-oat-black/50 mt-1 line-clamp-2 font-sans">
                      {tool.description}
                    </div>
                  </div>
                  {tool.tags && (
                    <div className="flex flex-wrap gap-1 mt-auto pt-1">
                      {tool.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] px-1.5 py-0.5 border border-oat-black/20 text-oat-black/40 font-sans"
                        >
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
        <div className="text-center py-12 text-oat-black/40">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-sans">No tools match "<strong>{search}</strong>"</p>
        </div>
      )}
    </div>
  );
}
