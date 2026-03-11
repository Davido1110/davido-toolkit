# Davido Toolkit — Hub CLAUDE.md

## What This Is
A browser-only React SPA serving as a multi-tool hub. Each tool lives in `src/tools/[tool-id]/` with its own `CLAUDE.md`. No backend.

## Stack
- Vite + React 18 + TypeScript
- React Router v6 (client-side routing)
- Tailwind CSS (with dark mode via `class` strategy)
- Lazy-loaded tool components (`React.lazy`)

## Adding a New Tool

1. Create folder: `src/tools/[tool-id]/`
2. Add `CLAUDE.md` in that folder with tool-specific context
3. Export a default React component from `src/tools/[tool-id]/index.tsx`
4. Register it in `src/config/tools.ts`:
   ```ts
   {
     id: 'my-tool',
     name: 'My Tool',
     description: '...',
     path: '/tools/my-tool',
     category: 'finance',   // must match a key in CATEGORIES
     icon: '🧮',
     component: lazy(() => import('../tools/my-tool')),
   }
   ```
5. That's it — routing, sidebar nav, and dashboard card are all auto-generated.

## Key Files
| File | Purpose |
|------|---------|
| `src/config/tools.ts` | Tool registry — single source of truth for all tools |
| `src/layout/AppLayout.tsx` | Root layout: Sidebar + Header + `<Outlet>` |
| `src/layout/Sidebar.tsx` | Left nav with search, category groups, nav links |
| `src/layout/Header.tsx` | Top bar: breadcrumb, dark mode toggle |
| `src/pages/Dashboard.tsx` | Home page — tool cards grid with search |
| `src/App.tsx` | BrowserRouter + Routes, renders tool components lazily |

## Tool Conventions
- Each tool is a self-contained folder under `src/tools/`
- Tools should NOT import from other tools
- Tools may import shared utilities from `src/lib/` (create as needed)
- Tool root component must be the **default export** of `index.tsx`
- Tools should adapt to dark mode using Tailwind `dark:` variants

## Categories (defined in tools.ts)
- `warehouse` — Warehouse & Purchasing
- `finance` — Finance & Tax
- `dev` — Development Tools
- `productivity` — Productivity
