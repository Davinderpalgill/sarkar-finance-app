import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, Alert, TextInput, KeyboardAvoidingView,
  Platform, Linking, AppState, AppStateStatus, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { OnboardingStackParamList } from '../../navigation/types/navigation';
import { isSignInLink, signInWithLink, sendSignInLink } from '../../api/firebase/auth';
import { useUiStore } from '../../store/uiStore';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'MagicLinkWait'>;
  route: RouteProp<OnboardingStackParamList, 'MagicLinkWait'>;
};

export default function MagicLinkWaitScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const { setUserId } = useUiStore();
  const [pastedLink, setPastedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const handleLink = async (url: string) => {
    if (!isSignInLink(url)) return;
    setLoading(true);
    try {
      const user = await signInWithLink(email, url);
      setUserId(user.uid);
      navigation.navigate('Permissions');
    } catch (e: any) {
      const msg = e.code === 'auth/invalid-action-code'
        ? 'This link has expired or already been used. Please request a new one.'
        : 'Sign-in failed. Make sure you are using the same device you requested the link on.';
      Alert.alert('Sign-in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Listen for the app being opened via deep link while it's running
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => handleLink(url));
    return () => sub.remove();
  }, []);

  // Check if app was opened via the sign-in link (cold start)
  useEffect(() => {
    Linking.getInitialURL().then(url => {
      if (url) handleLink(url);
    });
  }, []);

  const handleVerifyPasted = () => {
    const trimmed = pastedLink.trim();
    if (!trimmed) {
      Alert.alert('Paste the link', 'Copy the full URL from your browser and paste it above.');
      return;
    }
    handleLink(trimmed);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendSignInLink(email);
      Alert.alert('Sent!', `A new sign-in link has been sent to ${email}`);
    } catch {
      Alert.alert('Error', 'Could not resend the link. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const openMailApp = () => {
    Linking.openURL('message://').catch(() =>
      Linking.openURL('mailto:').catch(() => {})
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Icon */}
          <View style={styles.iconWrap}>
            <MaterialIcons name="mark-email-unread" size={40} color="#8257E6" />
          </View>

          <Text style={styles.heading}>Check your email</Text>
          <Text style={styles.sub}>
            We sent a sign-in link to{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>

          {/* Steps */}
          <View style={styles.stepsCard}>
            {[
              { n: '1', text: 'Open the email from Sarkar' },
              { n: '2', text: 'Tap the "Sign in to Sarkar" link' },
              { n: '3', text: 'Come back to this app — you\'ll be signed in' },
            ].map(step => (
              <View key={step.n} style={styles.stepRow}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{step.n}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.mailBtn} onPress={openMailApp} activeOpacity={0.85}>
            <MaterialIcons name="email" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.mailBtnText}>Open Mail App</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Link not opening the app?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => setShowPaste(v => !v)} style={styles.pasteToggle}>
            <Text style={styles.pasteToggleText}>
              {showPaste ? 'Hide' : 'Paste link manually'}
            </Text>
          </TouchableOpacity>

          {showPaste && (
            <View style={styles.pasteSection}>
              <Text style={styles.pasteHint}>
                Tap the link in the email → it opens in your browser → copy the URL from the browser address bar → paste it below.
              </Text>
              <TextInput
                style={styles.pasteInput}
                value={pastedLink}
                onChangeText={setPastedLink}
                placeholder="Paste sign-in link here"
                placeholderTextColor="#4B4B4B"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />
              <TouchableOpacity
                style={[styles.verifyBtn, loading && styles.btnDisabled]}
                onPress={handleVerifyPasted}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading
                  ? <ActivityIndicator color="#FFF" />
                  : <Text style={styles.verifyBtnText}>Verify & Sign In</Text>}
              </TouchableOpacity>
            </View>
          )}

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't get the email? </Text>
            <TouchableOpacity onPress={handleResend} disabled={resending}>
              {resending
                ? <ActivityIndicator size="small" color="#8257E6" />
                : <Text style={styles.resendLink}>Resend</Text>}
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Full-screen loading overlay */}
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#8257E6" />
          <Text style={styles.overlayText}>Signing you in…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0D0D0D' },
  content:         { flexGrow: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 40 },

  backBtn:         { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },

  iconWrap:        { width: 80, height: 80, borderRadius: 24, backgroundColor: '#8257E622', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },

  heading:         { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 10 },
  sub:             { fontSize: 15, color: '#6B6B6B', lineHeight: 22, marginBottom: 28 },
  emailHighlight:  { color: '#FFFFFF', fontWeight: '600' },

  stepsCard:       { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 14, marginBottom: 24, borderWidth: 1, borderColor: '#2C2C2C' },
  stepRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNum:         { width: 28, height: 28, borderRadius: 14, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepNumText:     { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  stepText:        { fontSize: 14, color: '#ABABAB', flex: 1, lineHeight: 20 },

  mailBtn:         { backgroundColor: '#8257E6', paddingVertical: 16, borderRadius: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  mailBtnText:     { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dividerRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine:     { flex: 1, height: 1, backgroundColor: '#2C2C2C' },
  dividerText:     { fontSize: 12, color: '#4B4B4B' },

  pasteToggle:     { alignSelf: 'center', marginBottom: 16 },
  pasteToggleText: { color: '#8257E6', fontSize: 14, fontWeight: '600' },

  pasteSection:    { gap: 12, marginBottom: 24 },
  pasteHint:       { fontSize: 13, color: '#6B6B6B', lineHeight: 19 },
  pasteInput:      { backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: 13, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2C', minHeight: 70, textAlignVertical: 'top' },
  verifyBtn:       { backgroundColor: '#8257E6', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  verifyBtnText:   { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  btnDisabled:     { opacity: 0.5 },

  resendRow:       { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  resendLabel:     { fontSize: 14, color: '#6B6B6B' },
  resendLink:      { fontSize: 14, color: '#8257E6', fontWeight: '600' },

  overlay:         { ...StyleSheet.absoluteFillObject, backgroundColor: '#0D0D0DCC', alignItems: 'center', justifyContent: 'center', gap: 16 },
  overlayText:     { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
