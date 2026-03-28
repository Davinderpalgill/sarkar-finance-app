import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { TransactionRepository } from '../../storage/repositories/TransactionRepository';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { formatCurrencyCompact } from '../../utils/currencyUtils';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<PlanStackParamList, 'BudgetPlanner'> };

// 50/30/20 category buckets
const NEEDS_CATS  = ['cat_rent', 'cat_utilities', 'cat_emi', 'cat_insurance', 'cat_health', 'cat_groceries'];
const WANTS_CATS  = ['cat_food', 'cat_transport', 'cat_shopping', 'cat_entertainment'];
const INCOME_CATS = ['cat_salary'];

interface BudgetData {
  avgIncome:     number;   // paise/month
  needsActual:   number;
  wantsActual:   number;
  savingsActual: number;
  categoryBreakdown: { id: string; name: string; color: string; amount: number; bucket: 'needs' | 'wants' | 'other' }[];
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}
const bar = StyleSheet.create({
  track: { height: 6, backgroundColor: '#2C2C2C', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
});

export default function BudgetPlannerScreen({ navigation }: Props) {
  const { userId } = useUiStore();
  const [loading, setLoading] = useState(true);
  const [data, setData]       = useState<BudgetData | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const now   = Date.now();
      const from3 = new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).getTime();
      const breakdown = await TransactionRepository.getCategoryBreakdown(userId, from3, now);

      let totalIncome = 0;
      const catMap: Record<string, number> = {};

      for (const row of breakdown) {
        if (!row.categoryId) continue;
        if (INCOME_CATS.includes(row.categoryId)) {
          totalIncome += row.totalCredit;
        } else {
          catMap[row.categoryId] = (catMap[row.categoryId] ?? 0) + row.totalDebit;
        }
      }

      const avgIncome = totalIncome / 3;
      let needsActual = 0;
      let wantsActual = 0;

      const catDetails = DEFAULT_CATEGORIES
        .map(cat => {
          const amount = catMap[cat.id] ?? 0;
          const bucket: 'needs' | 'wants' | 'other' =
            NEEDS_CATS.includes(cat.id) ? 'needs' :
            WANTS_CATS.includes(cat.id) ? 'wants' : 'other';
          if (bucket === 'needs') needsActual += amount;
          if (bucket === 'wants') wantsActual += amount;
          return { id: cat.id, name: cat.name, color: cat.color, amount: amount / 3, bucket };
        })
        .filter(c => c.amount > 0)
        .sort((a, b) => b.amount - a.amount);

      setData({
        avgIncome:     avgIncome,
        needsActual:   needsActual / 3,
        wantsActual:   wantsActual / 3,
        savingsActual: Math.max(0, avgIncome - needsActual / 3 - wantsActual / 3),
        categoryBreakdown: catDetails,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}><ActivityIndicator color="#6366F1" size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!data || data.avgIncome === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.empty}>No income data found for the last 3 months.</Text>
          <Text style={styles.emptySub}>Make sure salary/income transactions are categorised correctly.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const { avgIncome, needsActual, wantsActual, savingsActual } = data;
  const target50 = avgIncome * 0.50;
  const target30 = avgIncome * 0.30;
  const target20 = avgIncome * 0.20;

  // Surplus available for investment
  const surplus         = savingsActual;
  const emergencyMonths = 6;
  const monthlyExpenses = needsActual + wantsActual;
  const emergencyTarget = monthlyExpenses * emergencyMonths;

  const invEquity  = Math.round(surplus * 0.60);
  const invGold    = Math.round(surplus * 0.20);
  const invDebt    = Math.round(surplus * 0.15);
  const invSilver  = Math.round(surplus * 0.05);

  const BucketRow = ({
    label, actual, target, color,
  }: { label: string; actual: number; target: number; color: string }) => {
    const over = actual > target;
    const diff = Math.abs(actual - target);
    return (
      <View style={styles.bucketCard}>
        <View style={styles.bucketHeader}>
          <Text style={styles.bucketLabel}>{label}</Text>
          <View style={styles.bucketAmounts}>
            <Text style={[styles.bucketActual, over && styles.bucketOver]}>
              {formatCurrencyCompact(actual)}
            </Text>
            <Text style={styles.bucketSlash}> / </Text>
            <Text style={styles.bucketTarget}>{formatCurrencyCompact(target)}</Text>
          </View>
        </View>
        <ProgressBar value={actual} max={target * 1.5} color={over ? '#FF4757' : color} />
        <Text style={[styles.bucketDiff, over ? styles.overText : styles.underText]}>
          {over
            ? `₹${formatCurrencyCompact(diff)} over budget — reduce spending here`
            : `₹${formatCurrencyCompact(diff)} under — on track`}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={20} color="#ABABAB" />
          <Text style={styles.backText}>Wealth Planner</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Budget Planner</Text>
        <Text style={styles.sub}>Based on your last 3 months • Monthly average</Text>

        {/* Income card */}
        <View style={styles.incomeCard}>
          <Text style={styles.incomeLabel}>Avg Monthly Income</Text>
          <Text style={styles.incomeAmount}>{formatCurrencyCompact(avgIncome)}</Text>
        </View>

        {/* 50/30/20 buckets */}
        <Text style={styles.sectionTitle}>50 / 30 / 20 Rule</Text>
        <BucketRow label="Needs  (50%)"   actual={needsActual}  target={target50} color="#6366F1" />
        <BucketRow label="Wants  (30%)"   actual={wantsActual}  target={target30} color="#F59E0B" />
        <BucketRow label="Savings (20%)"  actual={savingsActual} target={target20} color="#10B981" />

        {/* Category breakdown */}
        <Text style={styles.sectionTitle}>Spending by Category</Text>
        <View style={styles.catList}>
          {data.categoryBreakdown.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catAmt}>{formatCurrencyCompact(cat.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Investment allocation */}
        {surplus > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recommended Investment Allocation</Text>
            <Text style={styles.surplusNote}>
              You have ~{formatCurrencyCompact(surplus)}/month to invest
            </Text>
            <View style={styles.allocCard}>
              <AllocRow label="Equity SIP (Mutual Funds)"    pct={60} amount={invEquity} color="#6366F1" />
              <AllocRow label="Gold (Sovereign Bond/ETF)"    pct={20} amount={invGold}   color="#F59E0B" />
              <AllocRow label="Debt (PPF / FD / NPS)"        pct={15} amount={invDebt}   color="#10B981" />
              <AllocRow label="Silver ETF"                   pct={5}  amount={invSilver}  color="#8B8B8B" />
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Emergency Fund First</Text>
              <Text style={styles.tipBody}>
                Target {formatCurrencyCompact(emergencyTarget)} (6 months of expenses).
                Build this in a liquid fund or savings account before aggressive SIPs.
              </Text>
            </View>

            <View style={styles.tipCard}>
              <Text style={styles.tipTitle}>Tax Saving (Section 80C)</Text>
              <Text style={styles.tipBody}>
                You can save up to ₹46,800/year in tax by investing ₹1.5L in ELSS, PPF, or NPS.
                That's ~₹12,500/month. Include this in your debt allocation.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AllocRow({ label, pct, amount, color }: { label: string; pct: number; amount: number; color: string }) {
  return (
    <View style={styles.allocRow}>
      <View style={[styles.allocDot, { backgroundColor: color }]} />
      <View style={styles.allocInfo}>
        <Text style={styles.allocLabel}>{label}</Text>
        <Text style={styles.allocAmt}>{formatCurrencyCompact(amount)}/mo</Text>
      </View>
      <Text style={[styles.allocPct, { color }]}>{pct}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  content:      { padding: 20, gap: 16, paddingBottom: 40 },
  back:         { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  backText:     { fontSize: 14, color: '#ABABAB' },
  heading:      { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  sub:          { fontSize: 13, color: '#6B6B6B' },
  incomeCard:   { backgroundColor: '#1A1A2E', borderRadius: 16, padding: 20, alignItems: 'center', gap: 4 },
  incomeLabel:  { fontSize: 13, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  incomeAmount: { fontSize: 32, fontWeight: '800', color: '#6366F1' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  bucketCard:   { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 8 },
  bucketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bucketLabel:  { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  bucketAmounts:{ flexDirection: 'row', alignItems: 'center' },
  bucketActual: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  bucketOver:   { color: '#FF4757' },
  bucketSlash:  { fontSize: 13, color: '#4B4B4B' },
  bucketTarget: { fontSize: 13, color: '#4B4B4B' },
  bucketDiff:   { fontSize: 12 },
  overText:     { color: '#FF4757' },
  underText:    { color: '#4ADE80' },
  catList:      { backgroundColor: '#1A1A1A', borderRadius: 14 },
  catRow:       { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C', gap: 10 },
  catDot:       { width: 8, height: 8, borderRadius: 4 },
  catName:      { flex: 1, fontSize: 14, color: '#ABABAB' },
  catAmt:       { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  surplusNote:  { fontSize: 13, color: '#10B981', marginTop: -8 },
  allocCard:    { backgroundColor: '#1A1A1A', borderRadius: 14 },
  allocRow:     { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#2C2C2C', gap: 12 },
  allocDot:     { width: 10, height: 10, borderRadius: 5 },
  allocInfo:    { flex: 1 },
  allocLabel:   { fontSize: 14, color: '#FFFFFF' },
  allocAmt:     { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  allocPct:     { fontSize: 16, fontWeight: '700' },
  tipCard:      { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, gap: 6 },
  tipTitle:     { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  tipBody:      { fontSize: 13, color: '#6B6B6B', lineHeight: 18 },
  empty:        { fontSize: 16, color: '#FFFFFF', fontWeight: '600', textAlign: 'center' },
  emptySub:     { fontSize: 13, color: '#6B6B6B', textAlign: 'center', lineHeight: 18 },
});
