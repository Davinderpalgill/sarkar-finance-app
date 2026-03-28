import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTransactionStore } from '../../store/transactionStore';
import { useUiStore } from '../../store/uiStore';
import { formatCurrency, formatCurrencyCompact } from '../../utils/currencyUtils';
import { formatDate } from '../../utils/dateUtils';
import { useCategoryMap } from '../../hooks/useCategoryMap';
import { AnalyticsStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<AnalyticsStackParamList, 'CustomRangeReport'>;
};

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

interface ReportData {
  totalIn: number;
  totalOut: number;
  savings: number;
  savingsRate: number;
  count: number;
  breakdown: Array<{ categoryId: string | null; name: string; color: string; totalDebit: number; pct: number }>;
}

export default function CustomRangeReportScreen({ navigation }: Props) {
  const userId = useUiStore(s => s.userId)!;
  const { getSummary, getCategoryBreakdown } = useTransactionStore();
  const catMap = useCategoryMap();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);

  const now = new Date();
  // Simple date pickers: year/month/day selectors
  const [fromDate, setFromDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [toDate, setToDate] = useState(new Date());

  const [editingFrom, setEditingFrom] = useState(false);
  const [editingTo, setEditingTo] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(0);
  const [pickerYear, setPickerYear] = useState(0);

  const generate = async () => {
    setLoading(true);
    try {
      const from = fromDate.getTime();
      const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate(), 23, 59, 59, 999).getTime();
      const [summary, breakdown] = await Promise.all([
        getSummary(userId, from, to),
        getCategoryBreakdown(userId, from, to),
      ]);
      const savings = summary.totalCredit - summary.totalDebit;
      const savingsRate = summary.totalCredit > 0
        ? Math.round((savings / summary.totalCredit) * 100) : 0;
      const mapped = breakdown
        .filter(r => r.totalDebit > 0)
        .map(r => {
          const cat = catMap.get(r.categoryId ?? '');
          return {
            categoryId: r.categoryId,
            name: cat?.name ?? 'Uncategorized',
            color: cat?.color ?? '#8257E6',
            totalDebit: r.totalDebit,
            pct: summary.totalDebit > 0 ? Math.round((r.totalDebit / summary.totalDebit) * 100) : 0,
          };
        });
      setReport({ totalIn: summary.totalCredit, totalOut: summary.totalDebit, savings, savingsRate, count: summary.count, breakdown: mapped });
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (which: 'from' | 'to') => {
    const d = which === 'from' ? fromDate : toDate;
    setPickerMonth(d.getMonth());
    setPickerYear(d.getFullYear());
    which === 'from' ? setEditingFrom(true) : setEditingTo(true);
  };

  const applyPicker = (which: 'from' | 'to') => {
    const d = new Date(pickerYear, pickerMonth, 1);
    if (which === 'from') { setFromDate(d); setEditingFrom(false); }
    else { setToDate(new Date(pickerYear, pickerMonth + 1, 0)); setEditingTo(false); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Custom Range Report</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Date range selectors */}
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('from')}>
            <Text style={styles.dateBtnLabel}>From</Text>
            <Text style={styles.dateBtnValue}>{formatDate(fromDate.getTime(), 'MMM yyyy')}</Text>
            <MaterialIcons name="calendar-today" size={14} color="#8257E6" />
          </TouchableOpacity>
          <MaterialIcons name="arrow-forward" size={16} color="#4B4B4B" />
          <TouchableOpacity style={styles.dateBtn} onPress={() => openPicker('to')}>
            <Text style={styles.dateBtnLabel}>To</Text>
            <Text style={styles.dateBtnValue}>{formatDate(toDate.getTime(), 'MMM yyyy')}</Text>
            <MaterialIcons name="calendar-today" size={14} color="#8257E6" />
          </TouchableOpacity>
        </View>

        {/* Month picker inline */}
        {(editingFrom || editingTo) && (
          <View style={styles.pickerCard}>
            <View style={styles.pickerNav}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)}>
                <MaterialIcons name="chevron-left" size={22} color="#8257E6" />
              </TouchableOpacity>
              <Text style={styles.pickerYear}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)}>
                <MaterialIcons name="chevron-right" size={22} color="#8257E6" />
              </TouchableOpacity>
            </View>
            <View style={styles.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.monthCell, pickerMonth === i && styles.monthCellActive]}
                  onPress={() => setPickerMonth(i)}
                >
                  <Text style={[styles.monthCellText, pickerMonth === i && styles.monthCellTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.pickerBtns}>
              <TouchableOpacity onPress={() => { setEditingFrom(false); setEditingTo(false); }}>
                <Text style={styles.pickerCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => applyPicker(editingFrom ? 'from' : 'to')}>
                <Text style={styles.pickerApply}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.generateBtn} onPress={generate} disabled={loading}>
          <MaterialIcons name="analytics" size={18} color="#FFF" />
          <Text style={styles.generateText}>{loading ? 'Generating...' : 'Generate Report'}</Text>
        </TouchableOpacity>

        {report && (
          <>
            {/* Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Income</Text>
                  <Text style={[styles.summaryValue, { color: '#00C896' }]}>{formatCurrencyCompact(report.totalIn)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Spent</Text>
                  <Text style={[styles.summaryValue, { color: '#FF4757' }]}>{formatCurrencyCompact(report.totalOut)}</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Savings</Text>
                  <Text style={[styles.summaryValue, { color: report.savings >= 0 ? '#00C896' : '#FF4757' }]}>
                    {formatCurrencyCompact(report.savings)}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Savings Rate</Text>
                  <Text style={[styles.summaryValue, { color: report.savingsRate >= 20 ? '#00C896' : '#FFA502' }]}>
                    {report.savingsRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Spending Breakdown</Text>
              {report.breakdown.map(item => (
                <View key={item.categoryId ?? 'null'} style={styles.catRow}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.catName}>{item.name}</Text>
                  <View style={styles.catBar}>
                    <View style={[styles.catBarFill, { width: `${item.pct}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={styles.catAmount}>{formatCurrencyCompact(item.totalDebit)}</Text>
                  <Text style={styles.catPct}>{item.pct}%</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:         { flex: 1, backgroundColor: '#0D0D0D' },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 8 },
  headerTitle:       { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  dateRow:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16 },
  dateBtn:           { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12, flex: 1 },
  dateBtnLabel:      { fontSize: 10, color: '#6B6B6B' },
  dateBtnValue:      { flex: 1, fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  pickerCard:        { marginHorizontal: 20, backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, marginBottom: 12 },
  pickerNav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 },
  pickerYear:        { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  monthGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 12 },
  monthCell:         { width: '23%', paddingVertical: 8, borderRadius: 8, backgroundColor: '#2C2C2C', alignItems: 'center' },
  monthCellActive:   { backgroundColor: '#8257E6' },
  monthCellText:     { fontSize: 13, color: '#ABABAB' },
  monthCellTextActive:{ color: '#FFF', fontWeight: '700' },
  pickerBtns:        { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  pickerCancel:      { fontSize: 14, color: '#6B6B6B', padding: 8 },
  pickerApply:       { fontSize: 14, color: '#8257E6', fontWeight: '700', padding: 8 },
  generateBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#8257E6', marginHorizontal: 20, borderRadius: 12, padding: 14, marginBottom: 20 },
  generateText:      { fontSize: 16, fontWeight: '700', color: '#FFF' },
  section:           { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle:      { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  summaryGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard:       { width: '47%', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12 },
  summaryLabel:      { fontSize: 10, color: '#6B6B6B', marginBottom: 4 },
  summaryValue:      { fontSize: 18, fontWeight: '700' },
  catRow:            { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot:               { width: 10, height: 10, borderRadius: 5 },
  catName:           { width: 110, fontSize: 12, color: '#ABABAB' },
  catBar:            { flex: 1, height: 6, backgroundColor: '#2C2C2C', borderRadius: 3 },
  catBarFill:        { height: 6, borderRadius: 3 },
  catAmount:         { width: 60, fontSize: 11, color: '#FFFFFF', textAlign: 'right' },
  catPct:            { width: 32, fontSize: 11, color: '#6B6B6B', textAlign: 'right' },
});
