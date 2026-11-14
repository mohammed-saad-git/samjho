import { scrubForSafeSharing, type SessionVault } from './detect';
import type { ExplainResponse } from './llm/schema';

/**
 * Builds a WhatsApp share message containing ONLY document type, summary, amounts,
 * and next steps — scrubbed of all vault values and redaction tokens.
 */
export function buildSafeWhatsAppText(explanation: ExplainResponse, vault: SessionVault): string {
  const safeDocType = scrubForSafeSharing(explanation.documentType, vault);
  const safeSummary = scrubForSafeSharing(explanation.summary, vault);

  const lines: string[] = [`*${safeDocType}*`, '', safeSummary];

  if (explanation.amounts.length > 0) {
    lines.push('', '*Amounts:*');
    for (const item of explanation.amounts) {
      lines.push(
        `- ${scrubForSafeSharing(item.value, vault)}: ${scrubForSafeSharing(item.what, vault)}`
      );
    }
  }

  if (explanation.nextSteps.length > 0) {
    lines.push('', '*Next steps:*');
    explanation.nextSteps.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${scrubForSafeSharing(step, vault)}`);
    });
  }

  lines.push('', '(Shared via Samjho with personal identifiers removed)');
  return lines.join('\n');
}

export function buildWhatsAppShareUrl(explanation: ExplainResponse, vault: SessionVault): string {
  const text = buildSafeWhatsAppText(explanation, vault);
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
