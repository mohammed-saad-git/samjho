# Samjho Deployment Guide

Follow these exact steps in order to deploy Samjho's backend (Supabase Edge Function) and frontend (Vercel).

Steps marked **[YOU — requires your account/credentials]** can only be run by you on your own machine/accounts. Never paste real keys into chat or commit `.env.local` or `supabase/functions/.env`.

---

## Step 1 — Confirm your Supabase project & `.env.local` **[YOU — requires your account/credentials]**

1. Open Supabase Dashboard (`https://supabase.com/dashboard/project/wsdgfqqerdeptjjcamop`).
2. Confirm your two public frontend values match `.env.local` (`NEVER put GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, or `sb_secret_` keys here):
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://wsdgfqqerdeptjjcamop.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: your **Publishable key** (`sb_publishable_...`) from **Project Settings -> API Keys** (sent via the `apikey` header only; `supabase/config.toml` sets `verify_jwt = false` for `explain` and validates `apikey` against Supabase's auto-injected `SUPABASE_PUBLISHABLE_KEYS`).

---

## Step 2 — Log in and link the Supabase project **[YOU — requires your account/credentials]**

```bash
npx supabase login
npx supabase link --project-ref wsdgfqqerdeptjjcamop
```

---

## Step 3 — Set Backend secrets **[YOU — requires your account/credentials]**

Do **not** use `supabase functions serve` unless Docker is available. Test against the deployed function via `npm run smoke:live` instead.

### Backend secrets

1. Copy the backend env template (already gitignored when copied to `.env`):
   ```bash
   cp supabase/functions/.env.example supabase/functions/.env
   ```
2. Paste your Gemini API key from Google AI Studio (`https://aistudio.google.com/apikey`) into `supabase/functions/.env` alongside `GEMINI_MODEL` and `ALLOWED_ORIGIN`:
   ```ini
   GEMINI_API_KEY=<paste-from-google-ai-studio>
   GEMINI_MODEL=gemini-3.8-flash
   ALLOWED_ORIGIN=http://localhost:3000
   ```
   _(Never add `ENVIRONMENT=development`—it enables localhost CORS in production—and never add `SUPABASE_*` variables such as `SUPABASE_PUBLISHABLE_KEYS`, which Supabase reserves and injects automatically.)_
3. Upload the secrets directly to Supabase Edge Function Secrets (the Gemini key is **never** needed in Vercel or `.env.local`):
   ```bash
   npx supabase secrets set --env-file supabase/functions/.env
   ```
   Or set inline directly:
   ```bash
   npx supabase secrets set GEMINI_API_KEY=<paste-from-google-ai-studio> GEMINI_MODEL=<model-id> ALLOWED_ORIGIN=http://localhost:3000
   ```
4. Optionally delete `supabase/functions/.env` after uploading, or leave it in place locally (it is gitignored and guarded by `npm run check:secrets`).

---

## Step 4 — Deploy the Supabase Edge Function

```bash
npx supabase functions deploy explain --use-api
```

_(Note: `--use-api` bundles shared TypeScript code from `lib/detect/` on Supabase servers without needing Docker locally. Because `[functions.explain]` uses `verify_jwt = false` for `sb_publishable_...` keys, the Edge Function validates `apikey` against auto-injected `SUPABASE_PUBLISHABLE_KEYS`, enforces `ALLOWED_ORIGIN`, applies in-memory per-IP rate limiting of 30 requests/minute, and enforces the 422 PII guard. Do not run `supabase db push` or create any database tables/migrations.)_

---

## Step 5 — Run live smoke test, generate sample fixtures, and commit **[YOU — requires live deployed credentials]**

Verify the live deployed Edge Function (positive checks on all 4 samples in English & Kannada plus 422 unredacted-PII and 403 disallowed-Origin checks), then generate verified pre-generated sample responses from the live function and commit `fixtures/sample-responses.json`:

```bash
npm run smoke:live
npm run generate:samples
npm run check:secrets
git add fixtures/sample-responses.json
git commit -m "chore: populate live-verified sample fixture responses"
```

---

## Step 6 — Deploy to Vercel, lock `ALLOWED_ORIGIN` to production URL, and re-verify **[YOU — requires your Vercel account]**

1. Push your branch to GitHub / link to Vercel, or run the Vercel CLI:
   ```bash
   npx vercel --prod
   ```
2. In **Vercel -> Project Settings -> Environment Variables**, configure **ONLY** the two public frontend variables:
   - `NEXT_PUBLIC_SUPABASE_URL` (`https://wsdgfqqerdeptjjcamop.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (your `sb_publishable_...` key; the Gemini key is **never** needed in Vercel, and `next.config.ts` includes `https://wsdgfqqerdeptjjcamop.supabase.co` in CSP `connect-src`)
3. Update `ALLOWED_ORIGIN` in Supabase Edge Function secrets to your final production Vercel URL (no trailing slash) and re-run the live smoke test:
   ```bash
   npx supabase secrets set ALLOWED_ORIGIN=https://<your-production-domain>.vercel.app
   SMOKE_ORIGIN=https://<your-production-domain>.vercel.app npm run smoke:live
   ```
