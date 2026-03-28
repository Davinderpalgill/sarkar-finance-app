import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types/navigation';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'Welcome'>;
};

const features = [
  { icon: '⚡', label: 'Auto-import transactions from Gmail bank emails' },
  { icon: '🧠', label: 'AI-powered smart category detection' },
  { icon: '📅', label: 'EMI tracking with payment reminders' },
  { icon: '🤝', label: 'Lend & borrow ledger with friends' },
  { icon: '👥', label: 'Split group expenses instantly' },
];

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />

      <View style={styles.content}>
        {/* Logo mark */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoSymbol}>₹</Text>
        </View>

        <Text style={styles.appName}>Sarkar</Text>
        <Text style={styles.tagline}>Your money.{'\n'}Under control.</Text>

        <View style={styles.divider} />

        <View style={styles.features}>
          {features.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <Text style={styles.featureText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('EmailLogin')}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        <Text style={styles.disclaimer}>Free forever. No hidden charges.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  content:      { flex: 1, paddingHorizontal: 28, paddingTop: 48, justifyContent: 'center' },

  logoWrap:     { width: 72, height: 72, borderRadius: 20, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoSymbol:   { fontSize: 36, color: '#FFFFFF', fontWeight: '700' },

  appName:      { fontSize: 13, fontWeight: '700', color: '#8257E6', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 12 },
  tagline:      { fontSize: 38, fontWeight: '800', color: '#FFFFFF', lineHeight: 46, marginBottom: 32 },

  divider:      { width: 40, height: 2, backgroundColor: '#2C2C2C', marginBottom: 32 },

  features:     { gap: 16 },
  featureRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  featureIcon:  { fontSize: 18, width: 28, textAlign: 'center' },
  featureText:  { fontSize: 15, color: '#ABABAB', flex: 1, lineHeight: 21 },

  footer:       { paddingHorizontal: 28, paddingBottom: 16, gap: 12 },
  button:       { backgroundColor: '#8257E6', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  buttonText:   { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  disclaimer:   { textAlign: 'center', fontSize: 12, color: '#4B4B4B' },
});
