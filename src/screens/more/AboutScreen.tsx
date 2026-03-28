import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Linking, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { MoreStackParamList } from '../../navigation/types/navigation';

type Props = { navigation: NativeStackNavigationProp<MoreStackParamList, 'About'> };

const APP_VERSION = '1.0.0';
const FEEDBACK_EMAIL = 'gilldav1997@gmail.com';
const WHATSAPP_NUMBER = '919872968689'; // +91 prefix for India

async function openLink(url: string) {
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open link', url);
    }
  } catch {
    Alert.alert('Error', 'Could not open the link.');
  }
}

export default function AboutScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* App identity */}
        <View style={styles.heroCard}>
          <View style={styles.appIcon}>
            <MaterialIcons name="account-balance-wallet" size={36} color="#8257E6" />
          </View>
          <Text style={styles.appName}>Sarkar</Text>
          <Text style={styles.appTagline}>Your personal finance companion</Text>
          <Text style={styles.appVersion}>Version {APP_VERSION}</Text>
        </View>

        {/* What we do */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What is Sarkar?</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              Sarkar helps you track your income, expenses, EMIs, and loans — all in one place. Import transactions from Gmail, categorise your spending automatically, and get a clear picture of your financial health.
            </Text>
            <View style={styles.featureList}>
              {[
                'Auto-import from Gmail bank emails',
                'Smart expense categorisation',
                'EMI & loan tracker',
                'Lend & borrow ledger',
                'Net worth & analytics dashboard',
                'Group expense splitting',
              ].map(f => (
                <View key={f} style={styles.featureRow}>
                  <MaterialIcons name="check-circle" size={16} color="#8257E6" />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Contact / Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <View style={styles.card}>

            <TouchableOpacity
              style={styles.row}
              onPress={() => openLink(`mailto:${FEEDBACK_EMAIL}?subject=Sarkar Feedback`)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#8257E622' }]}>
                <MaterialIcons name="email" size={20} color="#8257E6" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Send Feedback</Text>
                <Text style={styles.rowSub}>Ideas, bugs, suggestions</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => openLink(`mailto:${FEEDBACK_EMAIL}?subject=Sarkar Support Request`)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#00C89622' }]}>
                <MaterialIcons name="support-agent" size={20} color="#00C896" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Contact Support</Text>
                <Text style={styles.rowSub}>Help with a problem</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.row}
              onPress={() => openLink(`https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20I%20have%20feedback%20for%20Sarkar%20app`)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#25D36622' }]}>
                <MaterialIcons name="chat" size={20} color="#25D366" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>WhatsApp</Text>
                <Text style={styles.rowSub}>Chat directly with us</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>

          </View>
        </View>

        {/* Privacy note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              All your financial data is stored locally on your device. Nothing is shared with third parties. Gmail import reads only bank notification emails and never stores your credentials.
            </Text>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('PrivacyPolicy')}
              activeOpacity={0.7}
            >
              <View style={[styles.iconBox, { backgroundColor: '#8257E622' }]}>
                <MaterialIcons name="policy" size={20} color="#8257E6" />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Privacy Policy</Text>
                <Text style={styles.rowSub}>Read the full policy</Text>
              </View>
              <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.footer}>Made with ❤️ for India</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0D0D0D' },

  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn:     { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },

  content:     { padding: 20, gap: 24, paddingBottom: 48 },

  heroCard:    { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 28, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#2C2C2C' },
  appIcon:     { width: 72, height: 72, borderRadius: 20, backgroundColor: '#3D2A6E', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  appName:     { fontSize: 26, fontWeight: '800', color: '#FFFFFF' },
  appTagline:  { fontSize: 14, color: '#6B6B6B', textAlign: 'center' },
  appVersion:  { fontSize: 12, color: '#4B4B4B', marginTop: 4 },

  section:     { gap: 10 },
  sectionTitle:{ fontSize: 11, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 2 },
  card:        { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 12 },

  description: { fontSize: 14, color: '#ABABAB', lineHeight: 22 },

  featureList: { gap: 10, marginTop: 4 },
  featureRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: '#FFFFFF' },

  row:         { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox:     { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText:     { flex: 1 },
  rowLabel:    { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  rowSub:      { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  divider:     { height: 1, backgroundColor: '#2C2C2C' },

  footer:      { textAlign: 'center', fontSize: 13, color: '#4B4B4B', marginTop: 8 },
});
