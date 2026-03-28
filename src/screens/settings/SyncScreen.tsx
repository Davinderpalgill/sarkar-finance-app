import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator
} from 'react-native';
import { useSync } from '../../hooks/useSync';
import { formatDateTime, timeAgo } from '../../utils/dateUtils';

export default function SyncScreen() {
  const { sync, syncing, lastSyncedAt, syncError } = useSync();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sync Status</Text>
          <Text style={styles.label}>Last synced</Text>
          <Text style={styles.value}>
            {lastSyncedAt ? timeAgo(lastSyncedAt) : 'Never'}
          </Text>

          {lastSyncedAt && (
            <>
              <Text style={styles.label}>At</Text>
              <Text style={styles.value}>{formatDateTime(lastSyncedAt)}</Text>
            </>
          )}

          {syncError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{syncError}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.syncBtn, syncing && styles.disabled]}
          onPress={sync}
          disabled={syncing}
        >
          {syncing
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.syncBtnText}>Sync Now</Text>
          }
        </TouchableOpacity>

        <Text style={styles.info}>
          Syncs transactions, EMIs, ledger entries, and groups with Firebase.
          Raw SMS content never leaves your device.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content:   { flex: 1, padding: 24, gap: 20 },
  card:      { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 20, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  label:     { fontSize: 12, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.5 },
  value:     { fontSize: 16, color: '#FFFFFF', fontWeight: '500' },
  errorBox:  { backgroundColor: '#3D0A0A', borderRadius: 10, padding: 12, marginTop: 8 },
  errorText: { color: '#FF4757', fontSize: 13 },
  syncBtn:   { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center' },
  disabled:  { opacity: 0.6 },
  syncBtnText:{ color: '#FFF', fontSize: 17, fontWeight: '700' },
  info:      { color: '#4B4B4B', fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
