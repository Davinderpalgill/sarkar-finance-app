import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Switch, TextInput, ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DashboardStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useTour } from '../../tour/TourContext';
import { signOut, getCurrentUser, updateUserEmail, reauthenticateWithPassword, reloadUser } from '../../api/firebase/auth';
import { DEFAULT_CATEGORIES } from '../../config/categories';
import { BiometricService } from '../../services/BiometricService';
import { getCustomCategories, CustomCategory } from '../../utils/customCategories';
import {
  getAnthropicApiKey,
  setAnthropicApiKey,
  clearAnthropicApiKey,
} from '../../services/AnthropicService';

type Props = {
  navigation: NativeStackNavigationProp<DashboardStackParamList, 'Settings'>;
};

function ChangeEmailForm({ onSuccess }: { onSuccess: () => void }) {
  const [newEmail,        setNewEmail]        = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading,         setLoading]         = useState(false);

  const handleSubmit = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Password required', 'Enter your current password to confirm the change.');
      return;
    }
    setLoading(true);
    try {
      await reauthenticateWithPassword(currentPassword);
      await updateUserEmail(trimmed);
      Alert.alert(
        'Verification sent',
        `A confirmation link has been sent to ${trimmed}. Tap it to complete the email change.`
      );
      onSuccess();
    } catch (e: any) {
      const msg =
        e.code === 'auth/wrong-password'       ? 'Wrong password. Try again.' :
        e.code === 'auth/invalid-credential'   ? 'Wrong password. Try again.' :
        e.code === 'auth/email-already-in-use' ? 'That email is already in use.' :
        e.code === 'auth/invalid-email'        ? 'Invalid email address.' :
        `Failed (${e.code ?? 'unknown'}). Try signing out and back in first.`;
      Alert.alert('Could not update email', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.emailForm}>
      <Text style={styles.emailFormLabel}>New email address</Text>
      <TextInput
        style={styles.emailInput}
        value={newEmail}
        onChangeText={setNewEmail}
        placeholder="new@email.com"
        placeholderTextColor="#4B4B4B"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />
      <Text style={styles.emailFormLabel}>Current password (to confirm)</Text>
      <TextInput
        style={styles.emailInput}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        placeholder="Your password"
        placeholderTextColor="#4B4B4B"
        secureTextEntry
        autoCapitalize="none"
      />
      <TouchableOpacity
        style={[styles.emailSaveBtn, loading && { opacity: 0.5 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFF" size="small" />
          : <Text style={styles.emailSaveBtnText}>Update Email</Text>}
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen({ navigation }: Props) {
  const { userId, setUserId, setOnboarded } = useUiStore();
  const { clearAllTransactions } = useTransactionStore();
  const { resetTour } = useTour();
  const [bioAvailable,     setBioAvailable]     = useState(false);
  const [bioEnabled,       setBioEnabled]       = useState(false);
  const [bioType,          setBioType]          = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [apiKeyInput,      setApiKeyInput]      = useState('');
  const [apiKeySet,        setApiKeySet]        = useState(false);
  const [showEmailForm,    setShowEmailForm]    = useState(false);
  const [currentEmail,     setCurrentEmail]     = useState(getCurrentUser()?.email ?? '');

  useFocusEffect(useCallback(() => {
    reloadUser().then(() => setCurrentEmail(getCurrentUser()?.email ?? ''));
  }, []));

  useEffect(() => {
    (async () => {
      const { available, biometryType } = await BiometricService.isAvailable();
      setBioAvailable(available);
      setBioType(biometryType);
      if (available) setBioEnabled(await BiometricService.isEnabled());
      setCustomCategories(await getCustomCategories());
      const existing = await getAnthropicApiKey();
      setApiKeySet(!!existing);
    })();
  }, []);

  const handleSaveApiKey = async () => {
    const trimmed = apiKeyInput.trim();
    if (!trimmed.startsWith('gsk_')) {
      Alert.alert('Invalid key', 'Groq API keys start with gsk_');
      return;
    }
    await setAnthropicApiKey(trimmed);
    setApiKeySet(true);
    setApiKeyInput('');
    Alert.alert('Saved', 'Llama 3.1 (Groq) categorization is now active.');
  };

  const handleClearApiKey = () => {
    Alert.alert(
      'Remove API Key',
      'Transactions will be categorized using keyword rules instead.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await clearAnthropicApiKey();
            setApiKeySet(false);
            setApiKeyInput('');
          },
        },
      ]
    );
  };

  const handleBioToggle = async (value: boolean) => {
    if (value) {
      // Verify first before enabling
      const ok = await BiometricService.authenticate('Confirm your identity to enable Face ID');
      if (!ok) {
        Alert.alert('Authentication failed', 'Could not verify your identity.');
        return;
      }
    }
    await BiometricService.setEnabled(value);
    setBioEnabled(value);
  };

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your transactions. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            if (userId) {
              await clearAllTransactions(userId);
            }
            Alert.alert('Done', 'All transactions have been deleted.');
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Your local data will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try { await signOut(); } catch (_) { /* Firebase not configured */ }
            setUserId(null);
            setOnboarded(false);
          },
        },
      ]
    );
  };


  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const Row = ({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="Account">
          <TouchableOpacity
            style={styles.row}
            onPress={() => setShowEmailForm(v => !v)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Email</Text>
              <Text style={styles.rowSub}>{currentEmail || 'N/A'}</Text>
            </View>
            <MaterialIcons
              name={showEmailForm ? 'keyboard-arrow-up' : 'edit'}
              size={18}
              color="#8257E6"
            />
          </TouchableOpacity>

          {showEmailForm && (
            <ChangeEmailForm onSuccess={() => {
              setShowEmailForm(false);
              reloadUser().then(() => setCurrentEmail(getCurrentUser()?.email ?? ''));
            }} />
          )}

          <Row label="User ID" value={userId?.slice(0, 12) + '...' ?? 'N/A'} />
          <Row label="Sync" onPress={() => navigation.navigate('Sync')} />
        </Section>

        <Section title="Data Sources">
          <Row label="Account Aggregator" value="Link bank accounts" onPress={() => navigation.navigate('AASetup')} />
          <Row label="Gmail Import" value="Import bank emails" onPress={() => navigation.navigate('EmailSetup')} />
        </Section>

        <Section title="AI Categorization">
          <View style={styles.aiCard}>
            <View style={styles.aiStatusRow}>
              <Text style={styles.aiStatusLabel}>Groq / Llama 3.1</Text>
              <View style={[styles.aiStatusBadge, apiKeySet ? styles.aiStatusBadgeOn : styles.aiStatusBadgeOff]}>
                <Text style={[styles.aiStatusBadgeText, apiKeySet ? styles.aiStatusBadgeTextOn : styles.aiStatusBadgeTextOff]}>
                  {apiKeySet ? 'Active' : 'Not configured'}
                </Text>
              </View>
            </View>
            <Text style={styles.aiDesc}>
              {apiKeySet
                ? 'Transactions are classified using Llama 3.1 via Groq (free). Remove the key to revert to keyword rules.'
                : 'Enter a Groq API key (free at console.groq.com) to use Llama 3.1 for smarter categorization.'}
            </Text>
            {!apiKeySet ? (
              <View style={styles.aiInputRow}>
                <TextInput
                  style={styles.aiInput}
                  placeholder="gsk_..."
                  placeholderTextColor="#4B4B4B"
                  value={apiKeyInput}
                  onChangeText={setApiKeyInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={[styles.aiSaveBtn, !apiKeyInput.trim() && styles.aiSaveBtnDisabled]}
                  onPress={handleSaveApiKey}
                  disabled={!apiKeyInput.trim()}
                >
                  <Text style={styles.aiSaveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.aiRemoveBtn} onPress={handleClearApiKey}>
                <Text style={styles.aiRemoveBtnText}>Remove API Key</Text>
              </TouchableOpacity>
            )}
          </View>
        </Section>

        <Section title="Categories">
          {DEFAULT_CATEGORIES.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.catName}>{cat.name}</Text>
            </View>
          ))}
          {customCategories.map(cat => (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catDot, { backgroundColor: cat.color }]} />
              <Text style={styles.catName}>{cat.name}</Text>
              <Text style={styles.catCustomBadge}>Custom</Text>
            </View>
          ))}
        </Section>

        {bioAvailable && (
          <Section title="Security">
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowLabel}>
                  {bioType === 'FaceID' ? '🔒  Face ID' : '👆  Touch ID'}
                </Text>
                <Text style={styles.rowSub}>Lock app on every open</Text>
              </View>
              <Switch
                value={bioEnabled}
                onValueChange={handleBioToggle}
                trackColor={{ false: '#2C2C2C', true: '#3D2A6E' }}
                thumbColor={bioEnabled ? '#8257E6' : '#6B6B6B'}
              />
            </View>
          </Section>
        )}

        <Section title="Notifications">
          <Row label="EMI Reminders" />
          <Row label="Ledger Reminders" />
        </Section>

        <Section title="About">
          <Row label="Version" value="1.0.0" />
          <Row label="Verification Plan" value="8 test cases" />
          <Row label="App Tour" value="Replay guide" onPress={resetTour} />
        </Section>

        <Section title="Danger Zone">
          <TouchableOpacity style={styles.dangerRow} onPress={handleClearData}>
            <Text style={styles.dangerText}>Clear All Transactions</Text>
          </TouchableOpacity>
        </Section>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  content:      { padding: 16, gap: 24 },
  section:      { gap: 8 },
  sectionTitle: { fontSize: 13, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  sectionCard:  { backgroundColor: '#1A1A1A', borderRadius: 14 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  rowLabel:     { fontSize: 15, color: '#FFFFFF' },
  rowValue:     { fontSize: 14, color: '#6B6B6B' },
  rowSub:       { fontSize: 12, color: '#6B6B6B', marginTop: 2 },
  catRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  catDot:       { width: 10, height: 10, borderRadius: 5 },
  catName:        { fontSize: 14, color: '#ABABAB', flex: 1 },
  catCustomBadge: { fontSize: 11, color: '#8257E6', fontWeight: '600', backgroundColor: '#3D2A6E', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  emailForm:        { backgroundColor: '#111', padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: '#2C2C2C' },
  emailFormLabel:   { fontSize: 11, color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  emailInput:       { backgroundColor: '#2C2C2C', color: '#FFFFFF', fontSize: 15, padding: 12, borderRadius: 10, marginTop: 4 },
  emailSaveBtn:     { backgroundColor: '#8257E6', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 8 },
  emailSaveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  dangerRow:    { padding: 16, alignItems: 'center' },
  dangerText:   { color: '#FF4757', fontSize: 15, fontWeight: '600' },
  signOutBtn:   { backgroundColor: '#3D0A0A', padding: 18, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  signOutText:  { color: '#FF4757', fontSize: 16, fontWeight: '700' },
  // AI section
  aiCard:             { padding: 16, gap: 12 },
  aiStatusRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiStatusLabel:      { fontSize: 15, color: '#FFFFFF', fontWeight: '600' },
  aiStatusBadge:      { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  aiStatusBadgeOn:    { backgroundColor: '#14532D' },
  aiStatusBadgeOff:   { backgroundColor: '#2C2C2C' },
  aiStatusBadgeText:  { fontSize: 12, fontWeight: '600' },
  aiStatusBadgeTextOn:  { color: '#4ADE80' },
  aiStatusBadgeTextOff: { color: '#6B6B6B' },
  aiDesc:             { fontSize: 13, color: '#6B6B6B', lineHeight: 19 },
  aiInputRow:         { flexDirection: 'row', gap: 8 },
  aiInput:            { flex: 1, backgroundColor: '#2C2C2C', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#FFFFFF', fontSize: 13 },
  aiSaveBtn:          { backgroundColor: '#8257E6', paddingHorizontal: 16, borderRadius: 10, justifyContent: 'center' },
  aiSaveBtnDisabled:  { backgroundColor: '#3D2A6E' },
  aiSaveBtnText:      { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  aiRemoveBtn:        { backgroundColor: '#2C2C2C', padding: 10, borderRadius: 10, alignItems: 'center' },
  aiRemoveBtnText:    { color: '#FF4757', fontSize: 13, fontWeight: '600' },
});
