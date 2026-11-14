# Samjho

Samjho helps people understand official paperwork — bank loan notices, electricity bills, rental agreements, and government letters — in their own language (`English`, `हिन्दी`, `ಕನ್ನಡ`, `தமிழ்`, `తెలుగు`).

Personal identifiers are detected and redacted **on the user's device in the browser** before any text leaves the device. Only redacted text is sent to a Supabase Edge Function (`supabase/functions/explain`), which re-checks for missed identifiers, calls Gemini, and returns a plain-language structured explanation with bracketed tokens (`[PERSON_01]`, `[AADHAAR_01]`, `[ACCOUNT_01]`) that are restored locally from an in-memory session vault.

---

## Architecture

```mermaid
flowchart LR
  U["User uploads PDF / photo / sample"] --> EX["Browser Extraction (pdf.js or Tesseract.js Worker)"]
  EX --> DET["On-Device Detector (lib/detect: Verhoeff, Regex, Honorifics)"]
  DET --> VAULT["In-Memory SessionVault (never persisted)"]
  DET --> SPLIT["Interactive Split View & Computed Privacy Score"]
  SPLIT -->|Redacted text + Bearer anon key| EDGE["Supabase Edge Function: POST /functions/v1/explain"]
  EDGE --> CORS{"Origin Check (ALLOWED_ORIGIN) & verify_jwt"}
  CORS --> GUARD{"Server Defense-in-Depth (lib/detect -> 422 on Aadhaar/PAN/Phone/Email)"}
  GUARD -->|Clean| LLM["Gemini Flash REST API (GEMINI_MODEL secret)"]
  GUARD -->|Leaked PII| BLOCK["HTTP 422 Blocked"]
  LLM --> RES["Zod-Validated JSON Explanation"]
  RES --> REHYD["Local Rehydration + SpeechSynthesis + Safe WhatsApp Share"]
  VAULT --> REHYD
```

---

## Privacy & Threat Model

**Honest guarantee:** _Personal identifiers never leave your device._ Redacted text (containing bracketed placeholders alongside dates, rupee amounts, and clause text) **is** sent to the Supabase Edge Function and Gemini to generate the explanation — Samjho never claims "nothing leaves your device." No documents, extracted text, redacted text, or LLM outputs are ever stored in any database.

### What is protected

- **Aadhaar numbers:** 12 digits starting `2–9`, validated with the Verhoeff $D_5$ checksum (spaces and hyphens tolerated).
- **PAN numbers:** `[A-Z]{5}[0-9]{4}[A-Z]` restricted to valid 4th-character entity codes (`P, C, F, H, A, T, B, L, J, G`).
- **Indian mobile numbers:** `+91` / `91` / `0` prefixes and 10 digits starting `6–9`.
- **Email addresses, UPI handles, IFSC codes, Indian passport numbers.**
- **Dates of birth:** Only dates anchored to DOB labels (`DOB`, `Date of Birth`), leaving bill dates and payment deadlines intact so the explanation remains accurate.
- **Account / Consumer / Loan / Application numbers:** Keyword-anchored alphanumeric IDs.
- **Postal addresses:** Labeled address lines or lines ending in 6-digit Indian PIN codes.
- **Person names:** Heuristic detection via labeled fields (`Consumer Name:`, `Borrower:`), salutations, and Indian/English honorifics (`Shri`, `Smt.`, `Mr.`, `Ms.`, `Dr.`), plus click-to-toggle on any word in the original text.
- **Defense in depth:** `supabase/functions/explain` imports the exact same `lib/detect` pure TypeScript module (`../../../lib/detect/index.ts`) and returns **HTTP 422** if an unredacted Aadhaar, PAN, phone number, or email is present. Request bodies are never logged or stored.
- **Strict CORS & JWT check:** `verify_jwt = true` in `supabase/config.toml`; preflight `OPTIONS` and `POST` requests allow only `ALLOWED_ORIGIN` (plus localhost in local dev).
- **Ephemeral memory vault:** `SessionVault` lives strictly in JavaScript memory (no `localStorage`, no `sessionStorage`, no cookies, no analytics) and is cleared on **Clear session** and `beforeunload`/`pagehide`.
- **Safe WhatsApp share:** `wa.me` share links contain only document type, scrubbed summary, amounts, and next steps — never vault values or placeholder tokens.

### Known limitations (what is NOT guaranteed)

- **Heuristic name detection:** Unusual names without labels or honorifics, or regional spellings outside standard Latin capitalization, may be missed. Users should inspect the split view and click any missed word to redact it manually before confirming.
- **OCR accuracy:** Skewed, blurry, shadowed, or low-contrast camera photos can misread digits (breaking Verhoeff Aadhaar checks or PAN patterns). Samjho prompts the user to retake unclear photos.
- **Quasi-identifiers:** Monetary amounts, dates, organization names, and rare clauses remain in the redacted text so the model can explain deadlines and sums. Under extreme adversarial linkability, unique combinations of dates/amounts could indirectly identify a document.
- **Browser speech voices:** Audio playback uses the Web `SpeechSynthesis` API; availability of Hindi, Kannada, Tamil, or Telugu voices depends on the user's OS and browser voice packs. Samjho checks available voices per language and degrades gracefully when a voice is absent.

---

## Sample Documents & Pre-Generated Responses

To ensure the live demo remains reliable even under API rate limits, the four built-in sample documents (`public/samples/` — 3 PDFs and 1 synthetic PNG photo generated with valid Verhoeff Aadhaar checksums and fictional identities) are paired with pre-generated, schema-validated responses in `fixtures/sample-responses.json`.

- Loading any sample still runs the **real client-side PDF.js or Tesseract.js OCR extraction**, **real in-browser detection/redaction**, and **real computed privacy score**.
- Unmodified samples display a `sample, pre-generated` tag and offer a **Run live API instead** action.
- Modifying any redaction on a sample or uploading any user file **always hits the deployed Supabase Edge Function**.
- Running `npm run generate:samples` calls the deployed Supabase Edge Function across all 4 samples and 5 languages (`--docs-only` regenerates only the PDF/PNG files offline).

---

## Deployment & Local Setup

See [SETUP.md](./SETUP.md) for the complete dashboard-to-env checklist.

### 1. Frontend setup (Vercel + `.env.local`)

Copy `.env.example` to `.env.local` and set the two public Supabase values:

```ini
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

> Never put `GEMINI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`, the repository, or Vercel.

### 2. Backend setup (Supabase Edge Function)

```bash
npx supabase init
npx supabase link --project-ref <your-project-ref>
npx supabase secrets set GEMINI_API_KEY=<your-gemini-api-key> GEMINI_MODEL=gemini-3.8-flash ALLOWED_ORIGIN=https://<your-app>.vercel.app
npx supabase functions deploy explain --use-api
```

(`--use-api` bundles shared code from `lib/detect/` without duplicating it inside `supabase/functions/`.)

### 3. Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### Scripts

- `npm test` — Run Vitest unit, Verhoeff, round-trip vault, fixture redaction, and Supabase Edge Function security tests
- `npm run check:secrets` — Verify no API keys, private keys, or `service_role` tokens exist in the repo or git-tracked files
- `npm run typecheck` — Run strict TypeScript check (`tsc --noEmit`)
- `npm run lint` — Run ESLint
- `npm run build` — Copy `pdf.worker.min.mjs` and build production Next.js app
- `npm run generate:samples` — Regenerate sample PDFs/PNG and update `fixtures/sample-responses.json` via the deployed Edge Function (`-- --docs-only` for offline PDF/PNG regeneration)
