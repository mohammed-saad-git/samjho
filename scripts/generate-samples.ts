import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import sharp from 'sharp';
import {
  computePrivacyScore,
  detectPII,
  generateVerhoeffChecksum,
  redactText,
  SessionVault,
} from '../lib/detect/index.ts';
import { getSupabaseFunctionConfig } from '../lib/env';
import { SUPPORTED_LANGUAGES } from '../lib/i18n/languages';
import {
  ExplainResponseSchema,
  type ExplainResponse,
  type TargetLanguage,
} from '../lib/llm/schema';
import { SupabaseEdgeLLMProvider } from '../lib/llm/supabase';

function loadDotEnvLocal(): void {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(envLocalPath)) {
    return;
  }
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = line.slice(0, eqIndex).trim();
    let val = line.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key && !process.env[key]) {
      process.env[key] = val;
    }
  }
}

function formatAadhaar(digits: string): string {
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

const AADHAAR_1 = formatAadhaar(generateVerhoeffChecksum('49287163504'));
const AADHAAR_2 = formatAadhaar(generateVerhoeffChecksum('63819245710'));
const AADHAAR_3 = formatAadhaar(generateVerhoeffChecksum('74523819602'));
const AADHAAR_4 = formatAadhaar(generateVerhoeffChecksum('58192046371'));

export interface SampleDocSpec {
  id: string;
  filename: string;
  kind: 'pdf' | 'image';
  title: string;
  subtitle: string;
  documentHint: string;
  lines: string[];
}

export const SAMPLE_SPECS: readonly SampleDocSpec[] = [
  {
    id: 'electricity-bill',
    filename: 'electricity-bill.pdf',
    kind: 'pdf',
    title: 'Electricity bill with arrears',
    subtitle: 'PDF · Dakshin Bharat Power Distribution',
    documentHint: 'Electricity bill',
    lines: [
      'DAKSHIN BHARAT POWER DISTRIBUTION CO. LTD.',
      'MONTHLY ELECTRICITY BILL AND DISCONNECTION CAUTION NOTICE',
      'Bill Date: 04 Nov 2026 | Billing Cycle: Oct 2026',
      '------------------------------------------------------------',
      'Consumer Name: Shri Rameshwar Prasad Sharma',
      'Consumer No: KA-BLR-88412903',
      `Aadhaar Linked: ${AADHAAR_1}`,
      'Mobile: +91 98450 67123',
      'Email: rameshwar.sharma@example.com',
      'UPI Autopay VPA: rameshwar.sharma@okicici',
      'Billing Address: Flat 304, 14th Cross, Indiranagar Stage 2, Bengaluru - 560038',
      '------------------------------------------------------------',
      'Meter Reading: Previous 14,820 kWh | Current 15,140 kWh (320 units)',
      'Current Energy & Fixed Charges: Rs. 2,140.00',
      'Previous Unpaid Arrears (Sep 2026): Rs. 4,580.00',
      'Late Payment Surcharge: Rs. 250.00',
      'Total Amount Payable: Rs. 6,970.00',
      '------------------------------------------------------------',
      'Payment Due Date: 25 Nov 2026',
      'Notice: If Rs. 6,970.00 is not paid by 25 Nov 2026, power supply may be',
      'disconnected after 05 Dec 2026 under Clause 14 of Supply Code.',
      'To dispute meter reading, submit a written request at Sub-Division Office 4',
      'before 22 Nov 2026 with Consumer No KA-BLR-88412903.',
    ],
  },
  {
    id: 'bank-loan-notice',
    filename: 'bank-loan-notice.pdf',
    kind: 'pdf',
    title: 'Bank overdue loan notice',
    subtitle: 'PDF · Bharatiya Cooperative Bank',
    documentHint: 'Bank loan notice',
    lines: [
      'BHARATIYA COOPERATIVE BANK LTD. (RECOVERY & CREDIT CELL)',
      'FIRST REMINDER NOTICE: OVERDUE PERSONAL LOAN INSTALLMENTS',
      'Notice Date: 08 Nov 2026 | Ref: BCBL/REC/2026/1184',
      '------------------------------------------------------------',
      'Dear Smt. Ananya Deshmukh,',
      'Loan A/c: BCBL-LN-2024-004819',
      'PAN: AZSPD4819K',
      'DOB: 14/08/1984',
      'IFSC: BCBL0000142',
      'Registered Mobile: 98204 51920',
      'Residential Address: House No. 18, Sector 9, Vashi, Navi Mumbai - 400703',
      '------------------------------------------------------------',
      'Your monthly EMI of Rs. 9,225.00 for September 2026 and October 2026 remains unpaid.',
      'Overdue EMI Principal and Interest (2 months): Rs. 18,450.00',
      'Accrued Penal Charges (2% per month): Rs. 620.00',
      'Total Overdue Amount to Regularize: Rs. 19,070.00',
      '------------------------------------------------------------',
      'Action Required by 30 Nov 2026:',
      'Please deposit Rs. 19,070.00 into Loan A/c BCBL-LN-2024-004819 or visit',
      'the Vashi Branch with a restructuring application by 30 Nov 2026.',
      'Continued default beyond 30 Nov 2026 may be reported to credit bureaus',
      'under RBI guidelines and attract recovery proceedings.',
    ],
  },
  {
    id: 'rental-agreement',
    filename: 'rental-agreement.pdf',
    kind: 'pdf',
    title: 'Rental agreement excerpt',
    subtitle: 'PDF · Residential Leave & License',
    documentHint: 'Rental agreement',
    lines: [
      'RESIDENTIAL LEAVE AND LICENSE AGREEMENT (SUMMARY EXCERPT)',
      'Executed on: 10 Nov 2026 | Term: 11 Months (01 Dec 2026 to 31 Oct 2027)',
      '------------------------------------------------------------',
      'Lessor: Mr. Sundaramurthy Natarajan',
      `Lessor Aadhaar: ${AADHAAR_2} | Lessor PAN: BKNPN7291M`,
      'Tenant: Ms. Kavitha Rajagopal',
      `Tenant Aadhaar: ${AADHAAR_3} | Passport: L4829103`,
      'Tenant Mobile: +91 94441 82309 | Email: kavitha.rajagopal@example.in',
      'Property Address: Door No. 12, Second Main Road, Adyar, Chennai - 600020',
      '------------------------------------------------------------',
      '1. Monthly License Fee (Rent): Rs. 24,000.00 payable on or before the 5th of each month.',
      '2. Refundable Security Deposit: Rs. 1,20,000.00 paid prior to handover.',
      '3. Lock-in and Notice Period: Neither party may terminate during the first 3 months.',
      '   Thereafter, 60 days prior written notice is required by either party.',
      '4. Annual Escalation: Rent increases by 5% upon renewal after 31 Oct 2027.',
      '5. Maintenance and Utilities: Electricity and water bills are paid separately by Tenant.',
      'Signed by Lessor: Sundaramurthy Natarajan | Signed by Tenant: Kavitha Rajagopal',
    ],
  },
  {
    id: 'government-notice',
    filename: 'government-notice.png',
    kind: 'image',
    title: 'Government scholarship notice (photo)',
    subtitle: 'PNG photo scan · On-device Tesseract OCR',
    documentHint: 'Government notice',
    lines: [
      'DIRECTORATE OF SOCIAL WELFARE - SCHOLARSHIP CELL',
      'VERIFICATION & DISBURSEMENT INTIMATION NOTICE',
      'Date: 06 Nov 2026',
      'Applicant Name: Shri Devendra Kumar Verma',
      'Application No: SW-UP-2026-99412',
      `Aadhaar Number: ${AADHAAR_4}`,
      'Date of Birth: 19 May 2004',
      'Mobile: 94150 28374',
      'Bank Account No: 320988410052',
      'IFSC: SBIN0004123',
      'Address: Plot 47, Gomti Nagar Extension, Lucknow - 226010',
      'Approved Scholarship Grant: Rs. 18,500.00',
      'Status: Pending biometric and bank seeding verification.',
      'Important: Submit self-attested income certificate and',
      'institution bonafide letter at District Welfare Office',
      'on or before 10 Dec 2026, otherwise the grant of',
      'Rs. 18,500.00 will lapse for the 2026-27 cycle.',
    ],
  },
];

async function buildPdf(lines: string[], outPath: string): Promise<void> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 785;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const isHeading = i < 2;
    page.drawText(line, {
      x: 50,
      y,
      size: isHeading ? 12 : 10.5,
      font: isHeading ? boldFont : font,
      color: rgb(0.08, 0.075, 0.06),
    });
    y -= isHeading ? 22 : 18;
  }

  const bytes = await doc.save();
  fs.writeFileSync(outPath, bytes);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildPhotoPng(lines: string[], outPath: string): Promise<void> {
  const width = 1360;
  const height = 1040;
  const lineStartY = 128;
  const lineStep = 48;

  const textNodes = lines
    .map((line, idx) => {
      const y = lineStartY + idx * lineStep;
      const isTitle = idx < 2;
      return `<text x="96" y="${y}" font-family="DejaVu Sans, Arial, Helvetica, sans-serif" font-size="${
        isTitle ? 26 : 22
      }" font-weight="${isTitle ? '700' : '400'}" fill="#181713">${escapeXml(line)}</text>`;
    })
    .join('\n');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="${width}" height="${height}" fill="#DDD7CA" />
      <g transform="rotate(0 ${width / 2} ${height / 2})">
        <rect x="44" y="40" width="${width - 88}" height="${height - 80}" rx="4" fill="#F8F5EE" stroke="#BEB7A7" stroke-width="2" />
        <line x1="96" y1="196" x2="${width - 96}" y2="196" stroke="#181713" stroke-width="2" />
        ${textNodes}
        <rect x="${width - 330}" y="${height - 170}" width="210" height="72" fill="none" stroke="#36486B" stroke-width="2.5" rx="3" />
        <text x="${width - 225}" y="${height - 135}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="14" font-weight="700" fill="#36486B">VERIFIED SEAL</text>
        <text x="${width - 225}" y="${height - 114}" text-anchor="middle" font-family="DejaVu Sans, Arial, sans-serif" font-size="12" fill="#36486B">SOCIAL WELFARE CELL</text>
      </g>
    </svg>
  `;

  await sharp(Buffer.from(svg)).png({ quality: 95 }).toFile(outPath);
}

async function main(): Promise<void> {
  const docsOnly = process.argv.includes('--docs-only');
  const publicDir = path.resolve(process.cwd(), 'public/samples');
  const fixturesDir = path.resolve(process.cwd(), 'fixtures');
  const fixtureTextDir = path.join(fixturesDir, 'samples');

  fs.mkdirSync(publicDir, { recursive: true });
  fs.mkdirSync(fixtureTextDir, { recursive: true });

  let provider: SupabaseEdgeLLMProvider | null = null;
  if (!docsOnly) {
    loadDotEnvLocal();
    // Fail fast if frontend Supabase public env variables are not configured.
    const config = getSupabaseFunctionConfig();
    console.log(`Calling deployed Supabase Edge Function: ${config.explainFunctionUrl}`);
    provider = new SupabaseEdgeLLMProvider();
  }

  const outputResponses: Record<string, Record<TargetLanguage, ExplainResponse>> = {};

  for (const spec of SAMPLE_SPECS) {
    const outPublic = path.join(publicDir, spec.filename);
    const fullText = spec.lines.join('\n');

    if (spec.kind === 'pdf') {
      await buildPdf(spec.lines, outPublic);
    } else {
      await buildPhotoPng(spec.lines, outPublic);
    }

    fs.writeFileSync(path.join(fixtureTextDir, `${spec.id}.txt`), fullText, 'utf8');

    const vault = new SessionVault();
    const findings = detectPII(fullText, vault);
    const redacted = redactText(fullText, findings);
    const before = computePrivacyScore(fullText);
    const after = computePrivacyScore(redacted);

    console.log(
      `[sample:${spec.id}] findings=${findings.length} score=${before.score}->${after.score} tokens=${findings
        .map((f) => f.token)
        .join(', ')}`
    );

    const remainingHigh = detectPII(redacted).filter((f) => f.severity === 'high');
    if (remainingHigh.length > 0) {
      throw new Error(
        `Sample ${spec.id} still has high-severity findings after redaction: ${JSON.stringify(remainingHigh)}`
      );
    }

    if (docsOnly) {
      continue;
    }

    const liveForDoc = {} as Record<TargetLanguage, ExplainResponse>;
    for (const langConfig of SUPPORTED_LANGUAGES) {
      const result = await provider!.explain({
        redactedText: redacted,
        targetLanguage: langConfig.code,
        documentHint: spec.documentHint,
      });
      const parsed = ExplainResponseSchema.parse(result);
      liveForDoc[langConfig.code] = parsed;
      console.log(`  -> generated ${spec.id} (${langConfig.code}) via Supabase Edge Function`);
    }
    outputResponses[spec.id] = liveForDoc;
  }

  if (docsOnly) {
    console.log(
      'Regenerated public/samples/* and fixtures/samples/*.txt (--docs-only); fixtures/sample-responses.json left untouched.'
    );
    return;
  }

  const envelope = {
    _meta: {
      valid: true,
      generatedBy: 'supabase-edge-explain',
      generatedAt: new Date().toISOString(),
    },
    responses: outputResponses,
  };

  fs.writeFileSync(
    path.join(fixturesDir, 'sample-responses.json'),
    JSON.stringify(envelope, null, 2),
    'utf8'
  );
  console.log(
    'Regenerated public/samples/*, fixtures/samples/*.txt, and fixtures/sample-responses.json from deployed Supabase Edge Function.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
