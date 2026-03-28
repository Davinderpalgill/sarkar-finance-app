import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { paiseToRupees } from '../../utils/currencyUtils';
import { getAnthropicApiKey } from '../../services/AnthropicService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<PlanStackParamList, 'AICoach'> };

interface Message { role: 'user' | 'assistant'; content: string }

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.1-8b-instant';

const NEEDS_CATS  = ['cat_rent', 'cat_utilities', 'cat_emi', 'cat_insurance', 'cat_health', 'cat_groceries'];
const WANTS_CATS  = ['cat_food', 'cat_transport', 'cat_shopping', 'cat_entertainment'];

async function buildSystemPrompt(userId: string): Promise<string> {
  try {
    const now   = Date.now();
    const from3 = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).getTime();
    const breakdown = await TransactionRepository.getCategoryBreakdown(userId, from3, now);
    const summary   = await TransactionRepository.getSummary(userId, from3, now);
    const emis      = await TransactionRepository.findByUser(userId, { categoryId: 'cat_emi' });

    const monthlyIncome  = paiseToRupees(summary.totalCredit) / 3;
    const monthlyExpense = paiseToRupees(summary.totalDebit)  / 3;
    const savingsRate    = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome * 100).toFixed(1) : '0';

    const catLines = breakdown
      .filter(r => r.categoryId && r.totalDebit > 0)
      .map(r => {
        const cat = DEFAULT_CATEGORIES.find(c => c.id === r.categoryId);
        const bucket = NEEDS_CATS.includes(r.categoryId!) ? 'needs' : WANTS_CATS.includes(r.categoryId!) ? 'wants' : 'other';
        return `  - ${cat?.name ?? r.categoryId}: ₹${(paiseToRupees(r.totalDebit) / 3).toFixed(0)}/mo [${bucket}]`;
      }).join('\n');

    const emiCount = emis.length;

    return `You are a personal AI financial coach for an Indian user. You have access to their real financial data:

FINANCIAL SUMMARY (last 3 months average):
- Monthly Income:   ₹${monthlyIncome.toFixed(0)}
- Monthly Expenses: ₹${monthlyExpense.toFixed(0)}
- Monthly Savings:  ₹${(monthlyIncome - monthlyExpense).toFixed(0)}
- Savings Rate:     ${savingsRate}%
- Active EMIs:      ${emiCount}

SPENDING BY CATEGORY:
${catLines || '  No categorised spending data yet.'}

Your role:
- Give personalised, actionable advice based on the real numbers above
- Cover: SIP amounts, emergency fund, Section 80C tax saving, debt reduction, asset allocation
- Suggest across ALL asset classes: mutual funds (equity/debt), gold, silver, real estate REITs, PPF, NPS, FD
- Use Indian context: rupees, Indian regulations, Indian investment options
- Be concise and direct — no fluff
- If asked about market sectors or current trends, be clear you don't have real-time data and recommend using the Investment Analyzer tab

Start with a brief greeting that references their actual savings rate.`;
  } catch {
    return `You are a personal AI financial coach for Indian users. Give personalised financial advice covering SIPs, gold, silver, real estate, tax saving, and budgeting. Use Indian context and currency (₹).`;
  }
}

export default function AICoachScreen({ navigation }: Props) {
  const { userId } = useUiStore();
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [hasKey,      setHasKey]      = useState(false);
  const systemPromptRef = useRef('');
  const scrollRef       = useRef<ScrollView>(null);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const key = await getAnthropicApiKey();
    setHasKey(!!key);
    if (!key || !userId) {
      setInitialising(false);
      return;
    }
    const sysPrompt = await buildSystemPrompt(userId);
    systemPromptRef.current = sysPrompt;

    // Generate greeting
    await callLLM([], sysPrompt, key);
    setInitialising(false);
  };

  const callLLM = async (history: Message[], sysPrompt: string, apiKey?: string) => {
    const key = apiKey ?? await getAnthropicApiKey();
    if (!key) return;

    setLoading(true);
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 512,
          temperature: 0.7,
          messages: [
            { role: 'system', content: sysPrompt },
            ...history,
            ...(history.length === 0 ? [{ role: 'user', content: 'Hello! Give me a quick summary of my financial health and what I should focus on.' }] : []),
          ],
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data    = await res.json();
      const content = data?.choices?.[0]?.message?.content ?? 'Sorry, I could not generate a response.';
      const reply: Message = { role: 'assistant', content };
      setMessages(prev => [...prev, reply]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${err?.message ?? 'Something went wrong.'}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    await callLLM(newHistory, systemPromptRef.current);
  };

  if (!hasKey) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={20} color="#ABABAB" />
          <Text style={styles.backText}>Wealth Planner</Text>
        </TouchableOpacity>
        <View style={styles.center}>
          <MaterialIcons name="smart-toy" size={48} color="#4B4B4B" />
          <Text style={styles.noKeyTitle}>API Key Required</Text>
          <Text style={styles.noKeyDesc}>Go to Settings → AI Categorization and add your Groq API key to activate the AI Coach.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={20} color="#ABABAB" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>AI Financial Coach</Text>
            <Text style={styles.headerSub}>Llama 3.1 · Groq</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {initialising && (
            <View style={styles.thinking}>
              <ActivityIndicator color="#10B981" size="small" />
              <Text style={styles.thinkingText}>Analysing your finances...</Text>
            </View>
          )}
          {messages.map((msg, i) => (
            <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
              {msg.role === 'assistant' && (
                <View style={styles.aiAvatar}>
                  <MaterialIcons name="smart-toy" size={14} color="#10B981" />
                </View>
              )}
              <View style={[styles.bubbleText, msg.role === 'user' ? styles.userBubbleText : styles.aiBubbleText]}>
                <Text style={msg.role === 'user' ? styles.userText : styles.aiText}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {loading && messages.length > 0 && (
            <View style={[styles.bubble, styles.aiBubble]}>
              <View style={styles.aiAvatar}>
                <MaterialIcons name="smart-toy" size={14} color="#10B981" />
              </View>
              <View style={styles.aiBubbleText}>
                <ActivityIndicator color="#10B981" size="small" />
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about SIPs, gold, budgeting..."
            placeholderTextColor="#4B4B4B"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || loading}
          >
            <MaterialIcons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D' },
  back:           { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 16 },
  backText:       { fontSize: 14, color: '#ABABAB' },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  noKeyTitle:     { fontSize: 18, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' },
  noKeyDesc:      { fontSize: 14, color: '#6B6B6B', textAlign: 'center', lineHeight: 20 },
  header:         { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  headerInfo:     { flex: 1 },
  headerTitle:    { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  headerSub:      { fontSize: 11, color: '#4B4B4B' },
  onlineDot:      { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  messages:       { padding: 16, gap: 12, paddingBottom: 8 },
  thinking:       { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  thinkingText:   { fontSize: 13, color: '#6B6B6B' },
  bubble:         { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  userBubble:     { justifyContent: 'flex-end' },
  aiBubble:       { justifyContent: 'flex-start' },
  aiAvatar:       { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0D2B22', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bubbleText:     { maxWidth: '80%', borderRadius: 16, padding: 12 },
  userBubbleText: { backgroundColor: '#3D2A6E', borderBottomRightRadius: 4 },
  aiBubbleText:   { backgroundColor: '#1A1A1A', borderBottomLeftRadius: 4 },
  userText:       { color: '#FFFFFF', fontSize: 14, lineHeight: 20 },
  aiText:         { color: '#E0E0E0', fontSize: 14, lineHeight: 20 },
  inputRow:       { flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#1A1A1A', alignItems: 'flex-end' },
  input:          { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#FFFFFF', fontSize: 14, maxHeight: 100 },
  sendBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled:{ backgroundColor: '#1A1A1A' },
});
