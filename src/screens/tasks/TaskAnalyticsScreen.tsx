import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Dimensions, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { TaskStackParamList } from '../../navigation/types/navigation';
import { useTaskStore } from '../../store/taskStore';
import { useUiStore } from '../../store/uiStore';

type Props = { navigation: NativeStackNavigationProp<TaskStackParamList, 'TaskAnalytics'> };

type AnalyticsPeriod = 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';

const PERIOD_MAP: Record<AnalyticsPeriod, 'daily' | 'weekly' | 'monthly' | 'yearly'> = {
  Daily:   'daily',
  Weekly:  'weekly',
  Monthly: 'monthly',
  Yearly:  'yearly',
};

const PERIOD_SUBTITLE: Record<AnalyticsPeriod, string> = {
  Daily:   'Last 7 days',
  Weekly:  'Last 8 weeks',
  Monthly: 'Last 12 months',
  Yearly:  'Last 3 years',
};

const CHART_HEIGHT = 140;
const { width: windowWidth } = Dimensions.get('window');
const chartInnerWidth = windowWidth - 72; // 20px margin×2 + 16px card padding×2

export default function TaskAnalyticsScreen({ navigation }: Props) {
  const { taskStats, statsLoading, loadStats } = useTaskStore();
  const userId = useUiStore(s => s.userId);
  const [activePeriod, setActivePeriod] = useState<AnalyticsPeriod>('Monthly');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((period: AnalyticsPeriod) => {
    if (!userId) return;
    loadStats(userId, PERIOD_MAP[period]);
  }, [userId]);

  useFocusEffect(useCallback(() => {
    load(activePeriod);
  }, [userId, activePeriod]));

  const handlePeriodChange = (p: AnalyticsPeriod) => {
    setActivePeriod(p);
    load(p);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats(userId ?? '', PERIOD_MAP[activePeriod]);
    setRefreshing(false);
  };

  const stats = taskStats;

  // Bar chart geometry
  const buckets = stats?.periodBuckets ?? [];
  const maxCount = Math.max(1, ...buckets.map(b => b.count));
  const slotWidth = chartInnerWidth / Math.max(buckets.length, 1);
  const barWidth  = Math.max(Math.floor(slotWidth - 6), 4);

  // Completion rate
  const total    = stats?.total ?? 0;
  const done     = (stats?.completed ?? 0) + (stats?.closed ?? 0);
  const rate     = total > 0 ? Math.round((done / total) * 100) : 0;
  const rateColor = rate >= 80 ? '#4ADE80' : rate >= 50 ? '#F59E0B' : '#FF4757';

  // Priority totals for proportional bars
  const ph = stats?.priorityHigh ?? 0;
  const pm = stats?.priorityMedium ?? 0;
  const pl = stats?.priorityLow ?? 0;
  const pTotal = Math.max(ph + pm + pl, 1);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.heading}>Task Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Period tabs */}
      <View style={styles.periodRow}>
        {(['Daily', 'Weekly', 'Monthly', 'Yearly'] as AnalyticsPeriod[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, activePeriod === p && styles.periodTabActive]}
            onPress={() => handlePeriodChange(p)}
          >
            <Text style={[styles.periodLabel, activePeriod === p && styles.periodLabelActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {statsLoading && !refreshing ? (
        <ActivityIndicator color="#8257E6" style={{ marginTop: 48 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#8257E6" />
          }
        >
          {/* KPI grid */}
          <View style={styles.kpiGrid}>
            <View style={[styles.kpiCard, styles.kpiCardWhite]}>
              <Text style={styles.kpiValue}>{stats?.total ?? 0}</Text>
              <Text style={styles.kpiLabel}>Total</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#F59E0B33' }]}>
              <Text style={[styles.kpiValue, { color: '#F59E0B' }]}>{stats?.pending ?? 0}</Text>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#FF475733' }]}>
              <Text style={[styles.kpiValue, { color: '#FF4757' }]}>{stats?.overdue ?? 0}</Text>
              <Text style={styles.kpiLabel}>Overdue</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#4ADE8033' }]}>
              <Text style={[styles.kpiValue, { color: '#4ADE80' }]}>{stats?.completed ?? 0}</Text>
              <Text style={styles.kpiLabel}>Done</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#8257E633' }]}>
              <Text style={[styles.kpiValue, { color: '#8257E6' }]}>{stats?.closed ?? 0}</Text>
              <Text style={styles.kpiLabel}>Closed</Text>
            </View>
            <View style={[styles.kpiCard, { borderColor: '#2C2C2C', opacity: 0 }]} />
          </View>

          {/* Bar chart card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tasks Created</Text>
            <Text style={styles.cardSubtitle}>{PERIOD_SUBTITLE[activePeriod]}</Text>
            <View style={styles.chartArea}>
              {/* Bars */}
              <View style={styles.barsRow}>
                {buckets.map((b, i) => {
                  const barH = b.count > 0 ? Math.max(Math.round((b.count / maxCount) * CHART_HEIGHT), 3) : 0;
                  return (
                    <View
                      key={i}
                      style={[styles.barSlot, { width: slotWidth }]}
                    >
                      {b.count > 0 && (
                        <Text style={styles.barCountLabel}>{b.count}</Text>
                      )}
                      <View style={{ height: CHART_HEIGHT, justifyContent: 'flex-end' }}>
                        <View
                          style={[
                            styles.bar,
                            { width: barWidth, height: barH },
                          ]}
                        />
                      </View>
                      <Text style={styles.barXLabel} numberOfLines={1}>{b.label}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Completion rate card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Completion Rate</Text>
            <View style={styles.rateRow}>
              <Text style={[styles.rateValue, { color: rateColor }]}>{rate}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${rate}%` as any, backgroundColor: rateColor }]} />
            </View>
            <Text style={styles.rateSubtitle}>{done} of {total} tasks done or closed</Text>
          </View>

          {/* Priority breakdown card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Priority Breakdown</Text>
            <View style={styles.priorityList}>
              <View style={styles.priorityRow}>
                <View style={[styles.priorDot, { backgroundColor: '#FF4757' }]} />
                <Text style={styles.priorLabel}>High</Text>
                <View style={styles.priorBarTrack}>
                  <View style={[styles.priorBarFill, { flex: ph / pTotal, backgroundColor: '#FF4757' }]} />
                  <View style={{ flex: 1 - ph / pTotal }} />
                </View>
                <Text style={styles.priorCount}>{ph}</Text>
              </View>
              <View style={styles.priorityRow}>
                <View style={[styles.priorDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.priorLabel}>Medium</Text>
                <View style={styles.priorBarTrack}>
                  <View style={[styles.priorBarFill, { flex: pm / pTotal, backgroundColor: '#F59E0B' }]} />
                  <View style={{ flex: 1 - pm / pTotal }} />
                </View>
                <Text style={styles.priorCount}>{pm}</Text>
              </View>
              <View style={styles.priorityRow}>
                <View style={[styles.priorDot, { backgroundColor: '#4ADE80' }]} />
                <Text style={styles.priorLabel}>Low</Text>
                <View style={styles.priorBarTrack}>
                  <View style={[styles.priorBarFill, { flex: pl / pTotal, backgroundColor: '#4ADE80' }]} />
                  <View style={{ flex: 1 - pl / pTotal }} />
                </View>
                <Text style={styles.priorCount}>{pl}</Text>
              </View>
            </View>
          </View>

          {/* Status distribution card */}
          {total > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Status Distribution</Text>
              <View style={styles.distBar}>
                {(stats?.pending ?? 0) > 0 && (
                  <View style={[styles.distSegment, { flex: stats!.pending, backgroundColor: '#F59E0B' }]} />
                )}
                {(stats?.completed ?? 0) > 0 && (
                  <View style={[styles.distSegment, { flex: stats!.completed, backgroundColor: '#4ADE80' }]} />
                )}
                {(stats?.closed ?? 0) > 0 && (
                  <View style={[styles.distSegment, { flex: stats!.closed, backgroundColor: '#8257E6' }]} />
                )}
              </View>
              <View style={styles.distLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Pending {stats?.pending ?? 0}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#4ADE80' }]} />
                  <Text style={styles.legendText}>Done {stats?.completed ?? 0}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8257E6' }]} />
                  <Text style={styles.legendText}>Closed {stats?.closed ?? 0}</Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  header:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 12 },
  heading:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#FFFFFF' },

  periodRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 },
  periodTab: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C' },
  periodTabActive: { backgroundColor: '#3D2A6E', borderColor: '#8257E6' },
  periodLabel: { fontSize: 12, fontWeight: '600', color: '#6B6B6B' },
  periodLabelActive: { color: '#FFFFFF' },

  content: { paddingHorizontal: 20, gap: 16, paddingBottom: 24 },

  // KPI grid
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: (windowWidth - 60) / 3, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#2C2C2C', alignItems: 'center' },
  kpiCardWhite: { borderColor: '#4B4B4B' },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', marginBottom: 2 },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },

  // Card
  card: { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#2C2C2C' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  cardSubtitle: { fontSize: 11, color: '#6B6B6B', marginBottom: 12 },

  // Bar chart
  chartArea: { marginTop: 4 },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  barSlot: { alignItems: 'center' },
  barCountLabel: { fontSize: 8, color: '#8257E6', fontWeight: '700', marginBottom: 2 },
  bar: { backgroundColor: '#8257E6', borderRadius: 3 },
  barXLabel: { fontSize: 9, color: '#4B4B4B', marginTop: 4, textAlign: 'center' },

  // Completion rate
  rateRow: { alignItems: 'center', marginVertical: 4 },
  rateValue: { fontSize: 40, fontWeight: '800' },
  progressTrack: { height: 10, backgroundColor: '#2C2C2C', borderRadius: 5, overflow: 'hidden', marginTop: 8 },
  progressFill: { height: 10, borderRadius: 5 },
  rateSubtitle: { fontSize: 12, color: '#6B6B6B', marginTop: 8, textAlign: 'center' },

  // Priority breakdown
  priorityList: { gap: 12, marginTop: 8 },
  priorityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  priorLabel: { width: 50, fontSize: 13, color: '#CCCCCC', fontWeight: '500' },
  priorBarTrack: { flex: 1, height: 6, flexDirection: 'row', backgroundColor: '#2C2C2C', borderRadius: 3, overflow: 'hidden' },
  priorBarFill: { height: 6, borderRadius: 3 },
  priorCount: { width: 28, fontSize: 13, color: '#FFFFFF', fontWeight: '700', textAlign: 'right' },

  // Status distribution
  distBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginTop: 12, marginBottom: 12 },
  distSegment: { height: 10 },
  distLegend: { flexDirection: 'row', gap: 16, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, color: '#ABABAB', fontWeight: '500' },
});
