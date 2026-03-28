import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../../navigation/types/navigation';
import { fetchAllAssets, AssetData, fmtPct, trendColor } from '../../services/MarketDataService';
import { getAnthropicApiKey } from '../../services/AnthropicService';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<PlanStackParamList, 'InvestmentAnalyzer'> };

type TabKey = 'equity' | 'commodity' | 'realestate';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL    = 'llama-3.3-70b-versatile';   // use 70b for investment analysis quality

const TAB_LABELS: Record<TabKey, string> = {
  equity:      'Stocks',
  commodity:   'Gold & Silver',
  realestate:  'Real Estate',
};

const ANALYSIS_PROMPT = (assets: AssetData[]) => {
  const lines = assets.map(a =>
    `${a.name} (${a.category}): Price ${a.currentPrice.toFixed(2)} ${a.currency} | 1W: ${fmtPct(a.change1W)} | 1M: ${fmtPct(a.change1M)} | 3M: ${fmtPct(a.change3M)} | Trend: ${a.trend}`
  ).join('\n');

  return `You are an expert Indian investment analyst. Analyse the following live market data and give actionable investment recommendations.

LIVE MARKET DATA (as of today):
${lines}

Also consider these asset classes beyond the data above (use your knowledge):
- Physical Real Estate in Indian Tier-1/2 cities
- Sovereign Gold Bonds (SGBs) vs Gold ETFs
- Silver as industrial metal demand trend
- REITs (Real Estate Investment Trusts) listed in India

Provide:
1. TOP PICK: Which single asset/sector looks most attractive right now and why (2-3 sentences)
2. SECTOR OUTLOOK: Brief outlook for each sector (equity, gold, silver, real estate) — 1-2 sentences each
3. AVOID: What to stay away from and why
4. STRATEGY: Suggested allocation for a moderate-risk Indian investor with ₹10,000-50,000/month to invest

Be specific, use the actual numbers from the data, and keep total response under 400 words.`;
};

export default function InvestmentAnalyzerScreen({ navigation }: Props) {
  const [assets,       setAssets]       = useState<AssetData[]>([]);
  const [loadingData,  setLoadingData]  = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<TabKey>('equity');
  const [analysis,     setAnalysis]     = useState('');
  const [loadingAI,    setLoadingAI]    = useState(false);
  const [hasKey,       setHasKey]       = useState(false);
  const [dataError,    setDataError]    = useState(false);

  useEffect(() => {
    loadData();
    getAnthropicApiKey().then(k => setHasKey(!!k));
  }, []);

  const loadData = async () => {
    setLoadingData(true);
    setDataError(false);
    try {
      const data = await fetchAllAssets();
      if (data.length === 0) setDataError(true);
      setAssets(data);
    } catch {
      setDataError(true);
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  const handleAnalyze = async () => {
    if (assets.length === 0) return;
    const key = await getAnthropicApiKey();
    if (!key) return;

    setLoadingAI(true);
    setAnalysis('');
    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          temperature: 0.3,
          messages: [{ role: 'user', content: ANALYSIS_PROMPT(assets) }],
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setAnalysis(data?.choices?.[0]?.message?.content ?? 'No response.');
    } catch (err: any) {
      setAnalysis(`Error: ${err?.message ?? 'Could not get analysis.'}`);
    } finally {
      setLoadingAI(false);
    }
  };

  const filtered = assets.filter(a => a.category === activeTab);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor="#F59E0B" />}
      >
        {/* Header */}
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={20} color="#ABABAB" />
          <Text style={styles.backText}>Wealth Planner</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Investment Analyzer</Text>
        <Text style={styles.sub}>Live data · Pull to refresh · Powered by Yahoo Finance</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {TAB_LABELS[tab]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Asset cards */}
        {loadingData ? (
          <View style={styles.loadBox}>
            <ActivityIndicator color="#F59E0B" />
            <Text style={styles.loadText}>Fetching live data...</Text>
          </View>
        ) : dataError ? (
          <View style={styles.loadBox}>
            <MaterialIcons name="wifi-off" size={28} color="#4B4B4B" />
            <Text style={styles.loadText}>Could not fetch market data. Pull to retry.</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.loadBox}>
            <Text style={styles.loadText}>No data available for this category.</Text>
          </View>
        ) : (
          filtered.map(asset => <AssetCard key={asset.symbol} asset={asset} />)
        )}

        {/* Real estate note */}
        {activeTab === 'realestate' && !loadingData && (
          <View style={styles.noteCard}>
            <MaterialIcons name="info-outline" size={14} color="#6B6B6B" />
            <Text style={styles.noteText}>
              The Nifty Realty Index tracks listed real estate companies (DLF, Godrej Properties, etc.) — not direct physical property prices. For physical RE, use the AI analysis below for guidance.
            </Text>
          </View>
        )}

        {/* AI Analysis */}
        {!loadingData && assets.length > 0 && (
          <View style={styles.aiSection}>
            <Text style={styles.sectionTitle}>AI Investment Analysis</Text>
            {hasKey ? (
              <>
                <TouchableOpacity
                  style={[styles.analyzeBtn, loadingAI && styles.analyzeBtnDisabled]}
                  onPress={handleAnalyze}
                  disabled={loadingAI}
                >
                  {loadingAI ? (
                    <ActivityIndicator color="#0D0D0D" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="auto-awesome" size={16} color="#0D0D0D" />
                      <Text style={styles.analyzeBtnText}>
                        {analysis ? 'Refresh Analysis' : 'Analyse All Assets with AI'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                {analysis !== '' && (
                  <View style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <MaterialIcons name="smart-toy" size={14} color="#F59E0B" />
                      <Text style={styles.analysisLabel}>Llama 3.3 70B Analysis</Text>
                    </View>
                    <Text style={styles.analysisText}>{analysis}</Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.noKeyCard}>
                <Text style={styles.noKeyText}>Add a Groq API key in Settings to enable AI-powered analysis.</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            Disclaimer: This is not financial advice. Market data is fetched from public sources and may be delayed. Always consult a SEBI-registered investment advisor before investing.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AssetCard({ asset }: { asset: AssetData }) {
  const c1M  = trendColor(asset.change1M);
  const c3M  = trendColor(asset.change3M);
  const trendIcon = asset.trend === 'up' ? 'trending-up' : asset.trend === 'down' ? 'trending-down' : 'trending-flat';
  const trendClr  = asset.trend === 'up' ? '#4ADE80' : asset.trend === 'down' ? '#FF4757' : '#6B6B6B';

  return (
    <View style={styles.assetCard}>
      <View style={styles.assetTop}>
        <View style={styles.assetLeft}>
          <MaterialIcons name={trendIcon} size={18} color={trendClr} />
          <Text style={styles.assetName}>{asset.name}</Text>
        </View>
        <View style={styles.assetRight}>
          <Text style={styles.assetPrice}>
            {asset.currency === 'INR' ? '₹' : '$'}{asset.currentPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </Text>
        </View>
      </View>
      <View style={styles.assetChanges}>
        <ChangeChip label="1W" value={asset.change1W} />
        <ChangeChip label="1M" value={asset.change1M} />
        <ChangeChip label="3M" value={asset.change3M} />
      </View>
    </View>
  );
}

function ChangeChip({ label, value }: { label: string; value: number }) {
  const color = trendColor(value);
  return (
    <View style={chip.wrap}>
      <Text style={chip.label}>{label}</Text>
      <Text style={[chip.value, { color }]}>{fmtPct(value)}</Text>
    </View>
  );
}

const chip = StyleSheet.create({
  wrap:  { backgroundColor: '#2C2C2C', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  label: { fontSize: 10, color: '#6B6B6B' },
  value: { fontSize: 12, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  content:         { padding: 20, gap: 14, paddingBottom: 40 },
  back:            { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backText:        { fontSize: 14, color: '#ABABAB' },
  heading:         { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  sub:             { fontSize: 13, color: '#6B6B6B' },
  tabs:            { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4, gap: 4 },
  tab:             { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabActive:       { backgroundColor: '#F59E0B' },
  tabText:         { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  tabTextActive:   { color: '#0D0D0D' },
  loadBox:         { alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  loadText:        { fontSize: 14, color: '#6B6B6B', textAlign: 'center' },
  assetCard:       { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 10 },
  assetTop:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  assetLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  assetRight:      { alignItems: 'flex-end' },
  assetName:       { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  assetPrice:      { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  assetChanges:    { flexDirection: 'row', gap: 8 },
  noteCard:        { flexDirection: 'row', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  noteText:        { fontSize: 12, color: '#6B6B6B', flex: 1, lineHeight: 17 },
  aiSection:       { gap: 12 },
  sectionTitle:    { fontSize: 13, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  analyzeBtn:      { backgroundColor: '#F59E0B', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  analyzeBtnDisabled: { backgroundColor: '#78490B' },
  analyzeBtnText:  { fontSize: 14, fontWeight: '700', color: '#0D0D0D' },
  analysisCard:    { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, gap: 10 },
  analysisHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  analysisLabel:   { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  analysisText:    { fontSize: 14, color: '#E0E0E0', lineHeight: 22 },
  noKeyCard:       { backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16 },
  noKeyText:       { fontSize: 13, color: '#6B6B6B', textAlign: 'center', lineHeight: 18 },
  disclaimer:      { marginTop: 8 },
  disclaimerText:  { fontSize: 11, color: '#3A3A3A', textAlign: 'center', lineHeight: 16 },
});
