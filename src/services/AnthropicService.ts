import AsyncStorage from '@react-native-async-storage/async-storage';
import { ClassificationResult } from '../ml/TFLiteBridge';
import { DEFAULT_CATEGORIES } from '../config/categories';

const STORAGE_KEY = '@llm_api_key';
const MODEL       = 'llama-3.1-8b-instant';
const API_URL     = 'https://api.groq.com/openai/v1/chat/completions';

// In-memory result cache — keyed by first 200 chars of text
const _cache = new Map<string, ClassificationResult>();

const CATEGORY_LIST = DEFAULT_CATEGORIES
  .map(c => `${c.id}: ${c.name}`)
  .join('\n');

const SYSTEM_PROMPT = `You are a financial transaction categorizer for Indian bank transactions.
Given a bank SMS or email body, classify it into exactly one of these categories:

${CATEGORY_LIST}

Rules:
- UPI payment to a person name (e.g. "ANKUSH SHARMA", "R S TRAD") → cat_transfer
- Payments to food apps (Swiggy, Zomato) or restaurants → cat_food
- Salary/payroll credited → cat_salary
- EMI, loan installment deducted → cat_emi
- Mutual fund SIP, Zerodha, Groww → cat_investment
- Insurance premium → cat_insurance
- Rent/society maintenance → cat_rent
- When genuinely ambiguous → cat_other

Respond with ONLY a valid JSON object. No markdown, no explanation:
{"categoryId": "cat_xxx", "confidence": 0.0}`;

// ── Key management ────────────────────────────────────────────────────────────

export async function getAnthropicApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export async function setAnthropicApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, key.trim());
  _cache.clear();
}

export async function clearAnthropicApiKey(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
  _cache.clear();
}

// ── Classification ────────────────────────────────────────────────────────────

/**
 * Classify a transaction text using Groq (Llama 3.1).
 * Returns null if no API key is configured or the API call fails —
 * callers should fall back to keyword rules in that case.
 */
export async function classifyWithClaude(text: string): Promise<ClassificationResult | null> {
  const apiKey = await getAnthropicApiKey();
  if (!apiKey) return null;

  const cacheKey = text.slice(0, 200);
  if (_cache.has(cacheKey)) return _cache.get(cacheKey)!;

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 64,
        temperature: 0,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: text.slice(0, 600) },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[LLMService] API error', res.status, err);
      return null;
    }

    const data = await res.json();
    const raw  = data?.choices?.[0]?.message?.content?.trim() ?? '';

    // Strip markdown code fences if model adds them
    const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(clean);

    const validIds = new Set(DEFAULT_CATEGORIES.map(c => c.id));
    const categoryId = validIds.has(parsed.categoryId) ? parsed.categoryId : 'cat_other';
    const confidence = typeof parsed.confidence === 'number'
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.85;

    const result: ClassificationResult = { categoryId, confidence, merchantType: 'unknown' };
    _cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[LLMService] Classification error', err);
    return null;
  }
}
