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

| Variable                        | Where to get it                                                                                                                                                                                                                                  | Where to put it                                                          | Visibility         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Supabase Dashboard** -> **Project Settings** -> **API** (or **Data API**) -> **Project URL** (`https://wsdgfqqerdeptjjcamop.supabase.co`)                                                                                                      | `.env.local` AND **Vercel -> Project Settings -> Environment Variables** | Public by design   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Supabase Dashboard** -> **Project Settings** -> **API Keys** -> **Publishable key** (`sb_publishable_...`; sent in the `apikey` header only while the Edge Function validates it against Supabase's auto-injected `SUPABASE_PUBLISHABLE_KEYS`) | `.env.local` AND **Vercel -> Project Settings -> Environment Variables** | Public by design   |
| `GEMINI_API_KEY`                | **Google AI Studio** (`https://aistudio.google.com/apikey`) -> **Create API key**                                                                                                                                                                | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server secret ONLY |
| `GEMINI_MODEL`                  | Official Flash model ID from Google Gemini API docs (`gemini-3.8-flash`)                                                                                                                                                                         | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server config ONLY |
| `ALLOWED_ORIGIN`                | Your deployed Vercel URL (`https://<your-app>.vercel.app`; localhost is allowed automatically during local dev, or use comma-separated `https://<your-app>.vercel.app,http://localhost:3000` if testing locally against the cloud function)      | **Supabase Edge Function Secrets ONLY** (`npx supabase secrets set ...`) | Server config ONLY |

> **Security rule:** Do **not** copy or set `SUPABASE_SERVICE_ROLE_KEY` anywhere in this repository, `.env.local`, or Vercel. Samjho stores zero documents, zero extracted text, and zero LLM outputs in any database, so no service role key is needed.

---

## 3. Configure Local Frontend `.env.local`

- [ ] Copy `.env.example` to `.env.local` (contains ONLY the two public `NEXT_PUBLIC_` variables—never put `GEMINI_API_KEY` here):
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

## 4. Backend secrets & Deploy Edge Function

Do **not** use `supabase functions serve` unless Docker is available. Default to testing directly against your deployed Edge Function via `npm run smoke:live`.

`supabase/config.toml` sets `[functions.explain]` with `verify_jwt = false` because modern `sb_publishable_...` keys are non-JWT API keys sent in the `apikey` header only (never in `Authorization: Bearer`). Inside `supabase/functions/explain/index.ts`, every request's `apikey` header is verified against Supabase's auto-injected `SUPABASE_PUBLISHABLE_KEYS` alongside Origin CORS, best-effort per-IP rate limiting, payload caps, and the 422 PII guard. Do **not** set `SUPABASE_PUBLISHABLE_KEYS` manually via `supabase secrets set` (the `SUPABASE_` prefix is reserved by Supabase).
`supabase/functions/explain/index.ts` imports `lib/detect/index.ts` directly, so deploy with `--use-api` (no code duplication or Docker required):

### Backend secrets

- [ ] Link your Supabase project (`wsdgfqqerdeptjjcamop` for this project, or your Supabase Dashboard URL project ref):
  ```bash
  npx supabase link --project-ref wsdgfqqerdeptjjcamop
  ```
- [ ] Copy `supabase/functions/.env.example` to `supabase/functions/.env` and paste your key from Google AI Studio (`https://aistudio.google.com/apikey`) into it (never include `ENVIRONMENT=development` in this file):
  ```bash
  cp supabase/functions/.env.example supabase/functions/.env
  ```
- [ ] Upload the backend secrets to Supabase (delete `supabase/functions/.env` afterwards or keep it gitignored—the Gemini key is **never** needed in Vercel or `.env.local`):
  ```bash
  npx supabase secrets set --env-file supabase/functions/.env
  ```
- [ ] Deploy the Edge Function:
  ```bash
  npx supabase functions deploy explain --use-api
  ```

---

## 5. Run Live Smoke Test & Generate Sample Fixtures

- [ ] With `.env.local` configured and the Edge Function deployed, verify negative security guards (`422` / `403`) and live English + Kannada explanations:
  ```bash
  npm run smoke:live
  ```
- [ ] Regenerate `fixtures/sample-responses.json` directly from the deployed Edge Function and commit it:
  ```bash
  npm run generate:samples
  ```
- [ ] (Optional offline check only updates PDF/PNG fixtures without touching `fixtures/sample-responses.json`):
  ```bash
  npm run generate:samples -- --docs-only
  ```

---

## 6. Deploy Frontend to Vercel

- [ ] In **Vercel Dashboard -> Project Settings -> Environment Variables** (or via `npx vercel env add`), add ONLY:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    _(The Gemini key is **never** needed in Vercel.)_
- [ ] Deploy production build:
  ```bash
  npx vercel --prod
  ```
- [ ] Lock `ALLOWED_ORIGIN` in Supabase to your exact Vercel production URL (no trailing slash) and re-run `smoke:live`:
  ```bash
  npx supabase secrets set ALLOWED_ORIGIN=https://<your-final-vercel-domain>.vercel.app
  SMOKE_ORIGIN=https://<your-final-vercel-domain>.vercel.app npm run smoke:live
  ```

---

## 7. Pre-Submission Verification

- [ ] Run secret guard: `npm run check:secrets`
- [ ] Run unit + Edge Function tests: `npm test`
- [ ] Run strict typecheck: `npm run typecheck`
- [ ] Run ESLint: `npm run lint`
- [ ] Run production build: `npm run build`
