import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MoreStackParamList } from '../../navigation/types/navigation';

type Props = { navigation: NativeStackNavigationProp<MoreStackParamList, 'PrivacyPolicy'> };

const LAST_UPDATED = 'March 2025';

const SECTIONS = [
  {
    title: 'Data Storage',
    body: 'All your financial data — transactions, EMIs, ledger entries, budgets — is stored locally on your device using an encrypted SQLite database. Sarkar does not operate any servers that store your personal financial data.',
  },
  {
    title: 'Gmail Import',
    body: 'When you connect your Gmail account, Sarkar reads only bank notification emails to extract transaction details. Your Gmail credentials are never stored by Sarkar. Authentication is handled entirely by Google OAuth. You can revoke access at any time from your Google account settings.',
  },
  {
    title: 'Data We Collect',
    body: 'Sarkar does not collect any analytics, telemetry, or usage data. We do not track what screens you visit or how you use the app. The only data processed is the financial data you explicitly import or enter.',
  },
  {
    title: 'Third-Party Services',
    body: 'Sarkar uses Google Sign-In for Gmail access. Google\'s privacy policy applies to that authentication flow. No other third-party services have access to your financial data.',
  },
  {
    title: 'Notifications',
    body: 'EMI and ledger reminders are scheduled locally on your device using the system notification service. No data leaves your device to generate these reminders.',
  },
  {
    title: 'Data Deletion',
    body: 'Uninstalling Sarkar removes all locally stored data from your device. There is no cloud backup unless you explicitly use the Sync feature, in which case your data is encrypted before upload.',
  },
  {
    title: 'Children\'s Privacy',
    body: 'Sarkar is not directed at children under 18. We do not knowingly collect data from minors.',
  },
  {
    title: 'Contact',
    body: `If you have any questions about this privacy policy, contact us at gilldav1997@gmail.com.`,
  },
];

export default function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
        <Text style={styles.intro}>
          Sarkar is built with privacy as a core principle. Your financial data belongs to you and stays on your device.
        </Text>

        {SECTIONS.map(s => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By using Sarkar you agree to this privacy policy. We may update it occasionally — the latest version is always available within the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn:      { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle:  { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  content:      { padding: 20, gap: 24, paddingBottom: 48 },
  updated:      { fontSize: 12, color: '#4B4B4B' },
  intro:        { fontSize: 15, color: '#ABABAB', lineHeight: 24, backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, borderLeftWidth: 3, borderLeftColor: '#8257E6' },
  section:      { gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  sectionBody:  { fontSize: 14, color: '#ABABAB', lineHeight: 22 },
  footer:       { backgroundColor: '#1A1A1A', borderRadius: 14, padding: 16, marginTop: 8 },
  footerText:   { fontSize: 13, color: '#6B6B6B', lineHeight: 20, textAlign: 'center' },
});
