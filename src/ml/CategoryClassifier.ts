import { classifySms, classifySmsFallback, ClassificationResult } from './TFLiteBridge';
import { classifyWithClaude } from '../services/AnthropicService';
import { CONSTANTS } from '../config/constants';

/**
 * Classify a transaction text into a category.
 * Priority:
 *   1. Anthropic Claude (if API key is configured)
 *   2. TFLite native model (if native module is available)
 *   3. Keyword-based fallback rules
 */
export async function classifyCategory(body: string): Promise<ClassificationResult> {
  const claudeResult = await classifyWithClaude(body);
  if (claudeResult) return claudeResult;

  try {
    return await classifySms(body);
  } catch {
    return classifySmsFallback(body);
  }
}

export function requiresUserConfirmation(confidence: number): boolean {
  return confidence < CONSTANTS.CATEGORY_CONFIDENCE_THRESHOLD;
}
