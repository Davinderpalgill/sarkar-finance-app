import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, ActivityIndicator, Alert
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../navigation/types/navigation';
import { useUiStore } from '../../store/uiStore';
import { createNotificationChannels } from '../../services/NotificationService';
import { getDatabase } from '../../storage/database';

type Props = {
  navigation: NativeStackNavigationProp<OnboardingStackParamList, 'ProfileSetup'>;
};

export default function ProfileSetupScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { setOnboarded } = useUiStore();

  const handleFinish = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name to continue.');
      return;
    }
    setLoading(true);
    try {
      // userId is already set in the store by EmailLoginScreen
      await getDatabase();
      await createNotificationChannels();
      setOnboarded(true);
    } catch (e: any) {
      Alert.alert('Setup Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Almost there!</Text>
        <Text style={styles.subtitle}>What should we call you?</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#4B4B4B"
          autoCapitalize="words"
          autoFocus
        />
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleFinish}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color="#FFF" />
          : <Text style={styles.buttonText}>Start Tracking</Text>
        }
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0D0D0D', padding: 24 },
  content:        { flex: 1, justifyContent: 'center' },
  title:          { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  subtitle:       { fontSize: 16, color: '#ABABAB', marginBottom: 32 },
  input:          { backgroundColor: '#1A1A1A', color: '#FFFFFF', fontSize: 18, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2C2C2C' },
  button:         { backgroundColor: '#8257E6', padding: 18, borderRadius: 14, alignItems: 'center', marginBottom: 16 },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
