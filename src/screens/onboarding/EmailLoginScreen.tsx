import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, StatusBar,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types/navigation';
import { signInWithEmail, signUpWithEmail, sendPasswordReset, sendSignInLink } from '../../api/firebase/auth';
import { useUiStore } from '../../store/uiStore';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'EmailLogin'>;
};

type Mode = 'signin' | 'signup';
type AuthMethod = 'password' | 'magic';

function friendlyError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':           return 'That email address is not valid.';
    case 'auth/user-not-found':          return 'No account found with this email.';
    case 'auth/wrong-password':          return 'Wrong password. Try again or reset it.';
    case 'auth/email-already-in-use':    return 'An account with this email already exists.';
    case 'auth/weak-password':           return 'Password must be at least 6 characters.';
    case 'auth/too-many-requests':       return 'Too many attempts. Please wait and try again.';
    case 'auth/network-request-failed':  return 'No internet connection.';
    case 'auth/invalid-credential':      return 'Wrong email or password.';
    default:                             return 'Something went wrong. Please try again.';
  }
}

export default function EmailLoginScreen({ navigation }: Props) {
  const { setUserId } = useUiStore();
  const [mode, setMode] = useState<Mode>('signin');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    if (authMethod === 'magic') {
      setLoading(true);
      try {
        await sendSignInLink(trimmedEmail);
        navigation.navigate('MagicLinkWait', { email: trimmedEmail });
      } catch {
        Alert.alert('Error', 'Could not send the sign-in link. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const user = mode === 'signin'
        ? await signInWithEmail(trimmedEmail, password)
        : await signUpWithEmail(trimmedEmail, password);
      setUserId(user.uid);
      navigation.navigate('Permissions');
    } catch (e: any) {
      Alert.alert(
        mode === 'signin' ? 'Sign-in failed' : 'Sign-up failed',
        friendlyError(e.code ?? '')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      Alert.alert('Enter your email', 'Type your email above first, then tap "Forgot password".');
      return;
    }
    try {
      await sendPasswordReset(trimmedEmail);
      Alert.alert('Email sent', `Reset instructions sent to ${trimmedEmail}`);
    } catch (e: any) {
      Alert.alert('Error', friendlyError(e.code ?? ''));
    }
  };

  const toggleMode = () => {
    setMode(m => (m === 'signin' ? 'signup' : 'signin'));
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0D0D" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoWrap}>
              <Text style={styles.logoSymbol}>₹</Text>
            </View>
            <Text style={styles.heading}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </Text>
            <Text style={styles.subheading}>
              {mode === 'signin'
                ? 'Sign in to continue to Sarkar'
                : 'Start tracking your money today'}
            </Text>
          </View>

          {/* Method switcher */}
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={[styles.methodTab, authMethod === 'password' && styles.methodTabActive]}
              onPress={() => setAuthMethod('password')}
            >
              <Text style={[styles.methodTabText, authMethod === 'password' && styles.methodTabTextActive]}>
                Password
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.methodTab, authMethod === 'magic' && styles.methodTabActive]}
              onPress={() => setAuthMethod('magic')}
            >
              <Text style={[styles.methodTabText, authMethod === 'magic' && styles.methodTabTextActive]}>
                Magic Link
              </Text>
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#4B4B4B"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType={authMethod === 'magic' ? 'done' : 'next'}
                onSubmitEditing={authMethod === 'magic' ? handleSubmit : () => passwordRef.current?.focus()}
              />
            </View>

            {authMethod === 'password' && (
              <View style={styles.field}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  {mode === 'signin' && (
                    <TouchableOpacity onPress={handleForgotPassword}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.passwordRow}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.passwordInput]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
                    placeholderTextColor="#4B4B4B"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(v => !v)}
                  >
                    <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {authMethod === 'magic' && (
              <View style={styles.magicHint}>
                <Text style={styles.magicHintText}>
                  We'll email you a sign-in link. No password needed.
                </Text>
              </View>
            )}
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.buttonText}>
                  {authMethod === 'magic'
                    ? 'Send Sign-In Link'
                    : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </Text>
            }
          </TouchableOpacity>

          {/* Toggle (only for password mode) */}
          {authMethod === 'password' && (
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.toggleLink}>
                  {mode === 'signin' ? ' Sign up' : ' Sign in'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: '#0D0D0D' },
  content:       { flexGrow: 1, paddingHorizontal: 28, paddingTop: 32, paddingBottom: 32, justifyContent: 'center' },

  header:        { marginBottom: 40 },
  logoWrap:      { width: 56, height: 56, borderRadius: 16, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoSymbol:    { fontSize: 26, color: '#FFFFFF', fontWeight: '700' },
  heading:       { fontSize: 30, fontWeight: '800', color: '#FFFFFF', marginBottom: 6 },
  subheading:    { fontSize: 15, color: '#6B6B6B' },

  methodRow:          { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 12, padding: 4, marginBottom: 24, borderWidth: 1, borderColor: '#2C2C2C' },
  methodTab:          { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  methodTabActive:    { backgroundColor: '#8257E6' },
  methodTabText:      { fontSize: 14, fontWeight: '600', color: '#6B6B6B' },
  methodTabTextActive:{ color: '#FFFFFF' },

  magicHint:          { backgroundColor: '#8257E611', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#8257E633' },
  magicHintText:      { fontSize: 13, color: '#ABABAB', lineHeight: 20 },

  form:          { gap: 20, marginBottom: 28 },
  field:         {},
  labelRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  label:         { fontSize: 12, fontWeight: '600', color: '#ABABAB', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:         { backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: 16, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  passwordRow:   { flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, borderTopRightRadius: 0, borderBottomRightRadius: 0, borderRightWidth: 0 },
  eyeBtn:        { backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#2C2C2C', borderLeftWidth: 0, borderTopRightRadius: 14, borderBottomRightRadius: 14, paddingHorizontal: 14, paddingVertical: 16 },
  eyeText:       { fontSize: 16 },
  forgotText:    { color: '#8257E6', fontSize: 13, fontWeight: '500' },

  button:        { backgroundColor: '#8257E6', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 24 },
  buttonDisabled:{ opacity: 0.5 },
  buttonText:    { color: '#FFFFFF', fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },

  toggleRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  toggleLabel:   { fontSize: 14, color: '#6B6B6B' },
  toggleLink:    { fontSize: 14, color: '#8257E6', fontWeight: '600' },
});
