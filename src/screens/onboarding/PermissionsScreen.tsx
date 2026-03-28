import React, { useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, ActivityIndicator
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types/navigation';
import { usePermissions } from '../../hooks/usePermissions';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;
};

const PERMISSION_ITEMS = [
  { key: 'readSms',         label: 'Read SMS',            desc: 'Read bank messages to detect transactions', icon: '💬' },
  { key: 'receiveSms',      label: 'Receive SMS',         desc: 'Get notified of new transactions instantly', icon: '📨' },
  { key: 'readContacts',    label: 'Read Contacts',       desc: 'Pick contacts for ledger and group splits', icon: '👥' },
  { key: 'postNotifications', label: 'Notifications',     desc: 'Receive EMI and payment reminders', icon: '🔔' },
] as const;

export default function PermissionsScreen({ navigation }: Props) {
  const { status, checking, checkAll, requestAll } = usePermissions();

  useEffect(() => { checkAll(); }, []);

  const allGranted = PERMISSION_ITEMS.every(p => status[p.key] === 'granted');

  const handleGrant = async () => {
    const ok = await requestAll();
    if (ok) navigation.navigate('ProfileSetup');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>App Permissions</Text>
        <Text style={styles.subtitle}>
          Sarkar needs the following permissions to work properly.
          All data stays on your device.
        </Text>

        {PERMISSION_ITEMS.map(item => (
          <View key={item.key} style={styles.permItem}>
            <Text style={styles.permIcon}>{item.icon}</Text>
            <View style={styles.permInfo}>
              <Text style={styles.permLabel}>{item.label}</Text>
              <Text style={styles.permDesc}>{item.desc}</Text>
            </View>
            <View style={[
              styles.badge,
              status[item.key] === 'granted' ? styles.badgeGranted : styles.badgeDenied
            ]}>
              <Text style={styles.badgeText}>
                {status[item.key] === 'granted' ? '✓' : '—'}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        {checking && <ActivityIndicator color="#8257E6" style={{ marginBottom: 12 }} />}
        <TouchableOpacity style={styles.button} onPress={handleGrant}>
          <Text style={styles.buttonText}>
            {allGranted ? 'Continue' : 'Grant Permissions'}
          </Text>
        </TouchableOpacity>
        {!allGranted && (
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSetup')}>
            <Text style={styles.skip}>Skip for now</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },
  content:     { padding: 24 },
  title:       { fontSize: 28, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle:    { fontSize: 14, color: '#ABABAB', lineHeight: 20, marginBottom: 32 },
  permItem:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 16, marginBottom: 12, gap: 12 },
  permIcon:    { fontSize: 28 },
  permInfo:    { flex: 1 },
  permLabel:   { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  permDesc:    { fontSize: 13, color: '#ABABAB', marginTop: 2 },
  badge:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  badgeGranted:{ backgroundColor: '#00C896' },
  badgeDenied: { backgroundColor: '#4B4B4B' },
  badgeText:   { color: '#FFF', fontWeight: '700', fontSize: 14 },
  footer:      { padding: 24 },
  button:      { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center' },
  buttonText:  { color: '#FFF', fontSize: 18, fontWeight: '700' },
  skip:        { textAlign: 'center', color: '#6B6B6B', marginTop: 16, fontSize: 14 },
});
