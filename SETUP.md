# Samjho Setup & Deployment Checklist

Follow this checklist from top to bottom. Never paste real keys into chat, commit `.env.local`, or place `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in Vercel or client code.

---

## 1. Install Prerequisites & Authenticate CLIs

- [ ] Node.js 20+ installed (`npm install` already run)
- [ ] Log in to Supabase CLI:
  ```bash
  npx supabase login
  ```
- [ ] Log in to Vercel CLI (if deploying from CLI):
  ```bash
  npx vercel login
  ```

---

## 2. Where to Get Every Value & Where to Put It

| Variable                        | Where to get it                                                                                                                                                                                                                             | Where to put it                                                          | Visibility         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Supabase Dashboard** -> **Project Settings** -> **API** (or **Data API**) -> **Project URL** (`https://<project-ref>.supabase.co`)                                                                                                        | `.env.local` AND **Vercel -> Project Settings -> Environment Variables** | Public by design   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Supabase Dashboard** -> **Project Settings** -> **API Keys** -> **anon public** key (note: with `verify_jwt = true`, use the JWT-based `anon` key shown under Legacy API Keys / Project API Keys)                                         | `.env.local` AND **Vercel -> Project Settings -> Environment Variables** | Public by design   |
| `GEMINI_API_KEY`                | **Google AI Studio** (`https://aistudio.google.com/apikey`) -> **Create API key**                                                                                                                                                           | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server secret ONLY |
| `GEMINI_MODEL`                  | Official Flash model ID from Google Gemini API docs (`gemini-3.8-flash`)                                                                                                                                                                    | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server config ONLY |
| `ALLOWED_ORIGIN`                | Your deployed Vercel URL (`https://<your-app>.vercel.app`; localhost is allowed automatically during local dev, or use comma-separated `https://<your-app>.vercel.app,http://localhost:3000` if testing locally against the cloud function) | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server config ONLY |

> **Security rule:** Do **not** copy or set `SUPABASE_SERVICE_ROLE_KEY` anywhere in this repository, `.env.local`, or Vercel. Samjho stores zero documents, zero extracted text, and zero LLM outputs in any database, so no service role key is needed.

---

## 3. Configure Local Frontend `.env.local`

- [ ] Copy `.env.example` to `.env.local`:
  ```bash
  cp .env.example .env.local
  ```
- [ ] Fill in ONLY the two frontend public values in `.env.local`:
  ```ini
  NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
  ```
- [ ] Verify git ignores `.env.local` and our secret scanner passes:
  ```bash
  npm run check:secrets
  ```

---

## 4. Deploy Backend to Supabase Edge Functions

`supabase/config.toml` already sets `[functions.explain]` with `verify_jwt = true`.
`supabase/functions/explain/index.ts` imports `lib/detect/index.ts` directly, so deploy with `--use-api` (Supabase CLI v2.13.3+ server-side bundling, no code duplication or Docker required):

- [ ] Initialize Supabase workspace (already committed in `supabase/config.toml`; skip if reusing existing config):
  ```bash
  npx supabase init
  ```
- [ ] Link your Supabase project (`<project-ref>` is in your Supabase Dashboard URL):
  ```bash
  npx supabase link --project-ref <your-project-ref>
  ```
- [ ] Set the three backend-only secrets on Supabase (never in `.env.local` or Vercel):
  ```bash
  npx supabase secrets set GEMINI_API_KEY=<your-gemini-api-key> GEMINI_MODEL=gemini-3.8-flash ALLOWED_ORIGIN=https://<your-app>.vercel.app
  ```
- [ ] Deploy the Edge Function:
  ```bash
  npx supabase functions deploy explain --use-api
  ```

---

## 5. Refresh Pre-Generated Sample Fixtures via Deployed Function

- [ ] Once both `.env.local` and the Supabase Edge Function are live, regenerate `fixtures/sample-responses.json` through the real Edge Function pipeline:
  ```bash
  npm run generate:samples
  ```
- [ ] (Optional offline check only updates PDF/PNG fixtures without network calls):
  ```bash
  npm run generate:samples -- --docs-only
  ```

---

## 6. Deploy Frontend to Vercel

- [ ] In **Vercel Dashboard -> Project Settings -> Environment Variables** (or via `npx vercel env add`), add ONLY:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Deploy production build:
  ```bash
  npx vercel --prod
  ```
- [ ] Confirm `ALLOWED_ORIGIN` in Supabase matches your exact Vercel production URL (no trailing slash). If your assigned Vercel domain changed after first deploy, update it immediately:
  ```bash
  npx supabase secrets set ALLOWED_ORIGIN=https://<your-final-vercel-domain>.vercel.app
  ```

---

## 7. Pre-Submission Verification

- [ ] Run secret guard: `npm run check:secrets`
- [ ] Run unit + Edge Function tests: `npm test`
- [ ] Run strict typecheck: `npm run typecheck`
- [ ] Run ESLint: `npm run lint`
- [ ] Run production build: `npm run build`
