import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getAnthropicApiKey } from '../services/AnthropicService';

let Voice: any = null;
try {
  Voice = require('@react-native-voice/voice').default;
} catch {
  // native module not linked yet
}

// ── Groq task parsing ─────────────────────────────────────────────────────────

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

interface ParsedTask {
  title: string;
  priority: 'high' | 'medium' | 'low';
  dueDate: number | null;
  description: string;
}

async function parseTaskWithGroq(transcript: string, apiKey: string): Promise<ParsedTask> {
  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `You are a task parser. Given voice input text, extract a structured task.
Today's date is ${today}.
Return ONLY valid JSON (no markdown, no explanation):
{"title":"short action title","priority":"high|medium|low","dueDate":"YYYY-MM-DD or null","description":"extra detail or empty string"}
Rules:
- Infer priority from urgency words: urgent/important/जरूरी/ਜ਼ਰੂਰੀ = high, normal/regular = medium, someday/later/eventually = low
- Infer dueDate from relative terms: today, tomorrow, kal, next week, parso, etc.
- Keep title short (under 60 chars), actionable.`;

  const fetchPromise = fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      max_tokens: 256,
      temperature: 0.1,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Voice input: "${transcript}"` },
      ],
    }),
  });
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Groq request timed out')), 12000)
  );
  const res = await Promise.race([fetchPromise, timeoutPromise]);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Groq API error ${res.status}: ${JSON.stringify(err)}`);
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? '';
  const clean = raw.replace(/^```json?\s*/i, '').replace(/\s*```$/, '').trim();
  const parsed = JSON.parse(clean);

  const priority = ['high', 'medium', 'low'].includes(parsed.priority)
    ? parsed.priority as ParsedTask['priority']
    : 'medium';

  let dueDate: number | null = null;
  if (parsed.dueDate && parsed.dueDate !== 'null') {
    const d = new Date(parsed.dueDate);
    if (!isNaN(d.getTime())) dueDate = d.getTime();
  }

  return {
    title: String(parsed.title ?? transcript.slice(0, 60)),
    priority,
    dueDate,
    description: String(parsed.description ?? ''),
  };
}

// ── Language options ──────────────────────────────────────────────────────────

interface LangOption { code: string; label: string; native: string }

const LANGUAGES: LangOption[] = [
  { code: 'en-US', label: 'English', native: 'EN' },
  { code: 'hi-IN', label: 'Hindi',   native: 'हिं' },
  { code: 'pa-IN', label: 'Punjabi', native: 'ਪੰ' },
];

// ── Component ─────────────────────────────────────────────────────────────────

interface VoiceRecorderSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (prefill: {
    title?: string;
    description?: string;
    priority?: 'high' | 'medium' | 'low';
    dueDate?: number | null;
    voiceTranscript?: string;
    sourceLanguage?: string;
  }) => void;
}

type SheetState = 'idle' | 'listening' | 'parsing' | 'parsed' | 'error';

export default function VoiceRecorderSheet({ visible, onClose, onConfirm }: VoiceRecorderSheetProps) {
  const [lang, setLang] = useState<LangOption>(LANGUAGES[0]);
  const [state, setState] = useState<SheetState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedTask | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Ref holds the latest transcript so voice callbacks never read stale state
  const transcriptRef = useRef('');
  // Tracks whether we already started parsing (avoids double-trigger from
  // onSpeechEnd + onSpeechResults both firing)
  const parsingStarted = useRef(false);

  const updateTranscript = (text: string) => {
    transcriptRef.current = text;
    setTranscript(text);
  };

  const runParse = useCallback(async (text: string) => {
    if (parsingStarted.current) return;
    if (!text.trim()) { setState('idle'); return; }
    parsingStarted.current = true;
    setState('parsing');
    try {
      const apiKey = await getAnthropicApiKey();
      if (!apiKey) {
        setParsed({ title: text.slice(0, 80), priority: 'medium', dueDate: null, description: '' });
        setState('parsed');
        return;
      }
      const result = await parseTaskWithGroq(text, apiKey);
      setParsed(result);
      setState('parsed');
    } catch {
      setParsed({ title: text.slice(0, 80), priority: 'medium', dueDate: null, description: '' });
      setState('parsed');
    }
  }, []);

  // Register handlers and reset state every time the sheet opens.
  // Re-registering on each open is necessary because Voice.destroy() (called on
  // close) wipes the handlers from the native module.
  useEffect(() => {
    if (!Voice) return;

    if (visible) {
      setState('idle');
      updateTranscript('');
      setParsed(null);
      setErrorMsg('');
      parsingStarted.current = false;

      Voice.onSpeechStart = () => setState('listening');

      Voice.onSpeechEnd = () => {
        const text = transcriptRef.current;
        if (text) runParse(text);
        else setState('idle');
      };

      Voice.onSpeechError = (e: any) => {
        const code = e?.error?.code ?? e?.code ?? '';
        // Code 7 = "No match" (silence). Code 203 = permission denied on some iOS.
        if (code === '7' || code === 7) {
          setState('idle');
        } else {
          console.warn('[Voice] error', e);
          setState('error');
          setErrorMsg('Microphone error — please try again.');
        }
      };

      Voice.onSpeechPartialResults = (e: any) => {
        const partial = e?.value?.[0] ?? '';
        if (partial) updateTranscript(partial);
      };

      Voice.onSpeechResults = (e: any) => {
        const result = e?.value?.[0] ?? transcriptRef.current;
        if (result) {
          updateTranscript(result);
          runParse(result);
        } else {
          setState('idle');
        }
      };
    } else {
      Voice.stop().catch(() => {});
      Voice.destroy().catch(() => {});
    }
  }, [visible, runParse]);

  const handleMicPress = async () => {
    if (!Voice) {
      Alert.alert(
        'Voice not available',
        'Run: npm install @react-native-voice/voice && cd ios && pod install, then rebuild.',
      );
      return;
    }

    if (state === 'listening') {
      // Give immediate visual feedback — switch to parsing state right away,
      // then let Voice.stop() trigger onSpeechEnd/onSpeechResults.
      setState('parsing');
      parsingStarted.current = false; // reset so the upcoming callback can run
      try {
        await Voice.stop();
      } catch {
        // If stop fails but we have partial text, parse it now
        const text = transcriptRef.current;
        if (text) {
          runParse(text);
        } else {
          setState('idle');
        }
      }
      return;
    }

    // Start fresh
    updateTranscript('');
    setParsed(null);
    setErrorMsg('');
    parsingStarted.current = false;
    setState('listening');
    try {
      await Voice.start(lang.code);
    } catch (e: any) {
      console.warn('[Voice] start error', e);
      setState('error');
      setErrorMsg('Could not start microphone. Check permissions.');
    }
  };

  const handleRetry = () => {
    setState('idle');
    updateTranscript('');
    setParsed(null);
    setErrorMsg('');
    parsingStarted.current = false;
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onConfirm({
      title: parsed.title,
      description: parsed.description,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      voiceTranscript: transcriptRef.current,
      sourceLanguage: lang.code,
    });
  };

  const PRIORITY_COLOR = { high: '#FF4757', medium: '#F59E0B', low: '#4ADE80' } as const;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={state === 'idle' ? onClose : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.heading}>Voice Task</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcons name="close" size={22} color="#6B6B6B" />
            </TouchableOpacity>
          </View>

          {/* Language picker — only active when idle */}
          <View style={styles.langRow}>
            {LANGUAGES.map(l => (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, lang.code === l.code && styles.langChipActive]}
                onPress={() => { if (state === 'idle') setLang(l); }}
              >
                <Text style={[styles.langNative, lang.code === l.code && styles.langNativeActive]}>
                  {l.native}
                </Text>
                <Text style={[styles.langLabel, lang.code === l.code && styles.langLabelActive]}>
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Mic button — visible while idle or listening */}
            {(state === 'idle' || state === 'listening') && (
              <View style={styles.micSection}>
                <TouchableOpacity
                  style={[styles.micBtn, state === 'listening' && styles.micBtnActive]}
                  onPress={handleMicPress}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={state === 'listening' ? 'stop' : 'mic'}
                    size={36}
                    color="#fff"
                  />
                </TouchableOpacity>
                <Text style={styles.micHint}>
                  {state === 'idle' ? 'Tap to speak' : 'Listening… tap to stop'}
                </Text>
                {state === 'listening' && (
                  <View style={styles.listeningDots}>
                    {[0, 1, 2].map(i => (
                      <View key={i} style={[styles.dot, { opacity: 0.3 + i * 0.35 }]} />
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Live transcript while listening */}
            {transcript.length > 0 && (state === 'listening') && (
              <View style={styles.transcriptBox}>
                <Text style={styles.transcriptLabel}>Transcript</Text>
                <Text style={styles.transcriptText}>{transcript}</Text>
              </View>
            )}

            {/* Parsing spinner */}
            {state === 'parsing' && (
              <View style={styles.parsingSection}>
                <ActivityIndicator color="#8257E6" size="large" />
                <Text style={styles.parsingText}>Parsing with AI…</Text>
                {transcript.length > 0 && (
                  <Text style={styles.parsingTranscript} numberOfLines={3}>{transcript}</Text>
                )}
              </View>
            )}

            {/* Error */}
            {state === 'error' && (
              <View style={styles.errorBox}>
                <MaterialIcons name="error-outline" size={24} color="#FF4757" />
                <Text style={styles.errorText}>{errorMsg || 'Something went wrong'}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
                  <Text style={styles.retryBtnText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Parsed result */}
            {state === 'parsed' && parsed && (
              <View style={styles.parsedCard}>
                {transcript.length > 0 && (
                  <>
                    <Text style={styles.parsedSectionLabel}>Voice Input</Text>
                    <Text style={styles.parsedTranscript} numberOfLines={3}>{transcript}</Text>
                    <View style={styles.parsedDivider} />
                  </>
                )}
                <Text style={styles.parsedSectionLabel}>Task Preview</Text>
                <Text style={styles.parsedTitle}>{parsed.title}</Text>
                <View style={styles.parsedMeta}>
                  <View style={[styles.parsedBadge, { backgroundColor: PRIORITY_COLOR[parsed.priority] + '22', borderColor: PRIORITY_COLOR[parsed.priority] + '55' }]}>
                    <View style={[styles.parsedDot, { backgroundColor: PRIORITY_COLOR[parsed.priority] }]} />
                    <Text style={[styles.parsedBadgeText, { color: PRIORITY_COLOR[parsed.priority] }]}>
                      {parsed.priority.charAt(0).toUpperCase() + parsed.priority.slice(1)}
                    </Text>
                  </View>
                  {parsed.dueDate && (
                    <View style={styles.parsedBadge}>
                      <MaterialIcons name="schedule" size={12} color="#6B6B6B" />
                      <Text style={styles.parsedBadgeText}>
                        {new Date(parsed.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                  )}
                </View>
                {parsed.description ? (
                  <Text style={styles.parsedDesc}>{parsed.description}</Text>
                ) : null}
              </View>
            )}
          </ScrollView>

          {state === 'parsed' && parsed && (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleRetry}>
                <MaterialIcons name="replay" size={18} color="#6B6B6B" />
                <Text style={styles.actionBtnTextSecondary}>Retry</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtnPrimary} onPress={handleConfirm}>
                <MaterialIcons name="add-task" size={18} color="#fff" />
                <Text style={styles.actionBtnTextPrimary}>Add Task</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  sheet:     { backgroundColor: '#161616', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40 },
  handle:    { width: 40, height: 4, backgroundColor: '#2C2C2C', borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },

  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  heading:   { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },

  langRow:   { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 8 },
  langChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  langChipActive: { backgroundColor: '#1D1328', borderColor: '#8257E6' },
  langNative: { fontSize: 14, fontWeight: '700', color: '#6B6B6B' },
  langNativeActive: { color: '#8257E6' },
  langLabel: { fontSize: 12, color: '#6B6B6B' },
  langLabelActive: { color: '#A78BFA' },

  body:      { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },

  micSection: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  micBtn:    { width: 88, height: 88, borderRadius: 44, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', shadowColor: '#8257E6', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  micBtnActive: { backgroundColor: '#FF4757', shadowColor: '#FF4757' },
  micHint:   { fontSize: 14, color: '#6B6B6B' },
  listeningDots: { flexDirection: 'row', gap: 6 },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8257E6' },

  transcriptBox: { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  transcriptLabel: { fontSize: 11, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  transcriptText: { fontSize: 15, color: '#CCCCCC', lineHeight: 22 },

  parsingSection: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  parsingText: { fontSize: 14, color: '#6B6B6B' },
  parsingTranscript: { fontSize: 13, color: '#4B4B4B', textAlign: 'center', lineHeight: 18, paddingHorizontal: 16 },

  errorBox:  { alignItems: 'center', gap: 12, padding: 20 },
  errorText: { fontSize: 14, color: '#FF4757', textAlign: 'center' },
  retryBtn:  { paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#1A1A1A', borderRadius: 12 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  parsedCard: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', gap: 8 },
  parsedSectionLabel: { fontSize: 10, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1 },
  parsedTranscript: { fontSize: 13, color: '#6B6B6B', lineHeight: 18 },
  parsedDivider: { height: 1, backgroundColor: '#2C2C2C', marginVertical: 4 },
  parsedTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', lineHeight: 24 },
  parsedMeta: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  parsedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  parsedDot: { width: 6, height: 6, borderRadius: 3 },
  parsedBadgeText: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  parsedDesc: { fontSize: 13, color: '#ABABAB', lineHeight: 18 },

  actions:   { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, gap: 10 },
  actionBtnPrimary: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#8257E6' },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  actionBtnTextPrimary: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  actionBtnTextSecondary: { fontSize: 15, fontWeight: '600', color: '#6B6B6B' },
});
