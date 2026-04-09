# Brocha Artist Portal

Next.js 14 (App Router) onboarding wizard for Latin American artists to submit their profiles to the Brocha platform.

## Stack

- **Next.js 14** — App Router, all pages are client components (`'use client'`)
- **Supabase** — Auth, PostgreSQL database, file storage
- **Tailwind CSS** + **CSS Modules** — Design tokens in `styles/globals.css`
- **TypeScript** — Strict mode, no external state libraries

## Project Structure

```
app/
  layout.tsx          Root layout (imports styles/globals.css)
  page.tsx            Redirects to /portal
  portal/
    page.tsx          Main 4-step wizard page

components/portal/
  Stepper.tsx         Step progress indicator
  Step1Profile.tsx    Artist name, country, bio, photo, social links
  Step2Section.tsx    Tienda / Estudios selection
  Step3Tienda.tsx     Dynamic product cards
  Step3Estudios.tsx   Studio info, modules, sessions, resources
  Step3Combined.tsx   Tab switcher when both sections selected
  Step4Review.tsx     Summary review before submit
  modals/
    ModuleModal.tsx
    SessionModal.tsx
    ResourceModal.tsx
  ui/
    Badge.tsx
    FileDropzone.tsx
    PillSelector.tsx
    PriceInput.tsx

lib/
  supabase.ts         Supabase client + upload helpers + submitPortal()
  types.ts            All TypeScript types + initial state factories

styles/
  globals.css         CSS design tokens (:root variables) + all custom classes

supabase/
  schema.sql          Full DB schema — run in Supabase SQL editor
```

## Design Tokens

All CSS variables are defined in `styles/globals.css`:

| Variable | Value |
|----------|-------|
| `--deep` | `#100538` |
| `--deep2` | `#1a0a4a` |
| `--deep3` | `#0d0430` |
| `--purple` | `#7344E0` |
| `--yellow` | `#FDFF84` |
| `--pg` | `rgba(115,68,224,0.12)` |
| `--pb` | `rgba(115,68,224,0.35)` |
| `--muted` | `rgba(255,255,255,0.45)` |
| `--dim` | `rgba(255,255,255,0.75)` |

## Storage Buckets

Create these buckets in Supabase Storage (public unless noted):

| Bucket | Visibility |
|--------|-----------|
| `profile-photos` | public |
| `product-images` | public |
| `studio-covers` | public |
| `studio-videos` | public |
| `session-videos` | private |
| `resources` | private |

## Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Development

```bash
npm run dev      # http://localhost:3000 (redirects to /portal)
npm run build    # Production build
npm run start    # Start production server
```

## Wizard Flow

1. **Step 1 — Perfil**: Artist name, country, bio, profile photo, social links
2. **Step 2 — Secciones**: Select Tienda and/or Estudios
3. **Step 3 — Contenido**:
   - Tienda: Add products (físico/digital/curso), images, price, shipping
   - Estudios: Studio info, modules + sessions, resources
   - Both: Tab switcher between the two
4. **Step 4 — Revisión**: Summary with edit links → submit to Supabase

## Database Tables

`artists` → `submissions` (1:1)
`artists` → `products` (1:N)
`artists` → `studios` (1:N)
`studios` → `modules` (1:N)
`modules` → `sessions` (1:N)
`studios` → `resources` (1:N)

## Key Patterns

- All state lives in a single `PortalState` object in `app/portal/page.tsx`
- `update(patch)` is a `useCallback` that does shallow merge
- File uploads happen in `handleSubmit()` — files are held as `File` objects in state until submit
- Object URLs are used for image previews (created with `URL.createObjectURL`)
- `submitPortal()` in `lib/supabase.ts` handles all DB inserts in order
