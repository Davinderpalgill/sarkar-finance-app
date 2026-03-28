import { NativeModules } from 'react-native';
import { MerchantType } from '../models/Transaction';

const { TFLiteModule } = NativeModules;

export interface ClassificationResult {
  categoryId: string;
  confidence: number;
  merchantType: MerchantType;
}

let initialized = false;

export async function initTFLite(): Promise<void> {
  if (initialized) return;
  await TFLiteModule.initialize();
  initialized = true;
}

export async function classifySms(body: string): Promise<ClassificationResult> {
  if (!initialized) await initTFLite();
  const result = await TFLiteModule.classify(body);
  return {
    categoryId: result.categoryId,
    confidence: result.confidence,
    merchantType: result.merchantType as MerchantType,
  };
}

/** Stub implementation for testing without a real .tflite model */
export async function classifySmsFallback(body: string): Promise<ClassificationResult> {
  const lower = body.toLowerCase();

  const rules: Array<[string[], string]> = [
    [['swiggy', 'zomato', 'restaurant', 'food', 'cafe'],   'cat_food'],
    [['uber', 'ola', 'rapido', 'petrol', 'fuel', 'metro'],  'cat_transport'],
    [['amazon', 'flipkart', 'myntra', 'shop'],              'cat_shopping'],
    [['bigbasket', 'blinkit', 'grofers', 'grocery'],        'cat_groceries'],
    [['netflix', 'hotstar', 'spotify', 'prime'],            'cat_entertainment'],
    [['electricity', 'water', 'gas', 'recharge', 'wifi'],   'cat_utilities'],
    [['hospital', 'pharmacy', 'medical', 'doctor'],         'cat_health'],
    [['insurance', 'premium', 'policy'],                    'cat_insurance'],
    [['emi', 'installment', 'loan'],                        'cat_emi'],
    [['rent', 'maintenance', 'society'],                    'cat_rent'],
    [['salary', 'payroll', 'stipend'],                      'cat_salary'],
    [['transfer', 'neft', 'rtgs', 'imps'],                  'cat_transfer'],
    [['mutual fund', 'sip', 'zerodha', 'groww'],            'cat_investment'],
  ];

  for (const [keywords, catId] of rules) {
    if (keywords.some(k => lower.includes(k))) {
      return { categoryId: catId, confidence: 0.85, merchantType: 'merchant' };
    }
  }
  return { categoryId: 'cat_other', confidence: 0.80, merchantType: 'unknown' };
}
