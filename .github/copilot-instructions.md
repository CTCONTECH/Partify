# Partify — Copilot Instructions

## Project Summary
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4.
Role-based app for car owners and auto parts suppliers. Coupon-as-attribution business model.
Source of truth branch: `main`. Staging branch: `figma-redesign`.

---

## Branch Workflow

```
Figma pushes → figma-redesign → assess + fix → fast-forward main → push both
```

1. Pull latest `figma-redesign` from origin.
2. Run `npm run lint` and `npm run build`. Both must pass.
3. Apply compatibility fixes (see section below).
4. Verify runtime: `npm run dev`.
5. Commit fixes, then: `git checkout main && git merge --ff-only figma-redesign && git push origin main && git push origin figma-redesign`.

---

## Figma Compatibility Fixes (re-apply after every Figma push)

Figma generates for generic React/Vite. This project is Next.js App Router. The same issues recur every push:

### 1. React Router → Next.js navigation
Figma outputs `useParams`, `useNavigate` from `react-router`. Replace with Next.js equivalents.

```ts
// WRONG (Figma output)
import { useParams, useNavigate } from 'react-router';
const { partId } = useParams<{ partId: string }>();
const navigate = useNavigate();
navigate('/some/path');

// CORRECT
import { useParams, useRouter } from 'next/navigation';
const params = useParams();
const partId = params.partId as string | undefined;
const router = useRouter();
router.push('/some/path');
```

### 2. Import paths — use `@/` alias
Figma outputs relative paths like `../../components/TopBar`. Replace with workspace alias.

```ts
// WRONG
import { TopBar } from '../../components/TopBar';
import { mockParts } from '@/app/data/mockData';

// CORRECT
import { TopBar } from '@/components/TopBar';
import { mockParts } from '@/data/mockData';
```

### 3. Hook order — no hooks after conditional returns
Figma sometimes places `useEffect` after an early return. All hooks must appear before any `return`.

### 4. Supabase RPC calls — cast to `any` for unresolved function types
Until the database.types.ts is fully generated from a live Supabase instance, RPC calls need a cast:

```ts
// WRONG
await supabase.rpc('my_function', { ... });

// CORRECT
await (supabase as any).rpc('my_function', { ... });
```

### 5. Coupon redemption status filter
```ts
// WRONG
.eq('status', ['issued', 'opened', 'navigation_started'])

// CORRECT
.in('status', ['issued', 'opened', 'navigation_started'])
```

### 6. Adapter factory — use `isLiveMode()` guard
```ts
// WRONG
config.dataSource === 'live' ? new SupabaseRepo() : new MockRepo()

// CORRECT
isLiveMode() ? new SupabaseRepo() : new MockRepo()
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Mock vs live data source toggle (`NEXT_PUBLIC_DATA_SOURCE`) |
| `src/lib/adapters/factory.ts` | Returns correct repository based on config |
| `src/lib/adapters/mock.ts` | In-memory mock data (default for dev) |
| `src/lib/adapters/supabase.ts` | Live Supabase repository implementations |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/server.ts` | Server-side Supabase client (cookies) |
| `supabase/migrations/` | 10 ordered SQL migrations — run in sequence |
| `.env.example` | Required environment variables |

---

## Environment Variables (required for live mode)
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DATA_SOURCE=live` (default is `mock`)

Dev mode works fully without Supabase using mock data.

---

## ESLint Config Notes
`eslint.config.mjs` disables four rules that conflict with Figma-generated output:
- `@typescript-eslint/no-explicit-any` — Figma uses `any` extensively in adapters
- `react/no-unescaped-entities` — Figma uses raw apostrophes in JSX strings
- `react-hooks/set-state-in-effect` — Figma uses setState inside effects
- `react-hooks/purity` — Figma uses `Math.random` in sidebar skeleton

Do not remove these overrides without also fixing the generated code.

---

## General Rules
- Never push directly to `main` — always go through `figma-redesign` assessment first.
- Never deploy/push without explicit user confirmation.
- Mock mode is default; never switch to live mode unless Supabase credentials are configured.
- Keep communication concise and focused.
- Follow development best practices.
