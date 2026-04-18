import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { MoreStackParamList } from '../../navigation/types/navigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { getCurrentUser, reloadUser } from '../../api/firebase/auth';

type Props = { navigation: NativeStackNavigationProp<MoreStackParamList, 'MoreHome'> };

const SECTIONS = [
  {
    title: 'Finance',
    items: [
      { icon: 'account-balance-wallet', color: '#6366F1', label: 'Accounts',    sub: 'Bank accounts & balances',        tab: 'Accounts', screen: 'AccountList'  },
      { icon: 'account-balance',        color: '#F59E0B', label: 'EMIs',         sub: 'Track loan instalments',          tab: 'EMI',      screen: 'EMIList'      },
      { icon: 'handshake',              color: '#10B981', label: 'Ledger',       sub: 'Money lent & borrowed',           tab: 'Ledger',   screen: 'LedgerHome'   },
      { icon: 'group',                  color: '#EC4899', label: 'Groups',       sub: 'Split expenses with friends',     tab: 'Groups',   screen: 'GroupList'    },
      { icon: 'home-work',              color: '#14B8A6', label: 'Rent Collection', sub: 'Track rent & remind tenants',  tab: 'Rent',     screen: 'RentHome'     },
      { icon: 'task-alt',               color: '#8B5CF6', label: 'Tasks',           sub: 'Voice-powered task manager',    tab: 'Tasks',    screen: 'TaskHome'     },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'email',           color: '#8257E6', label: 'Gmail Import', sub: 'Connect & sync bank emails',     tab: 'Dashboard', screen: 'EmailSetup'   },
      { icon: 'sync',            color: '#4ADE80', label: 'Sync',         sub: 'Cloud backup & restore',         tab: 'Dashboard', screen: 'Sync'         },
      { icon: 'settings',        color: '#ABABAB', label: 'Settings',     sub: 'Privacy, categories, biometrics', tab: 'Dashboard', screen: 'Settings'    },
    ],
  },
  {
    title: 'App',
    items: [
      { icon: 'info-outline', color: '#F59E0B', label: 'About Sarkar', sub: 'Feedback, contact & app info', tab: '', screen: 'About' },
    ],
  },
];

export default function MoreHomeScreen({ navigation }: Props) {
  const tabNav = navigation.getParent() as any;
  const [email, setEmail] = useState(getCurrentUser()?.email ?? '');

  useFocusEffect(useCallback(() => {
    reloadUser().then(() => {
      setEmail(getCurrentUser()?.email ?? '');
    });
  }, []));

  const initials = email ? email[0].toUpperCase() : '?';

  const handlePress = (tab: string, screen: string) => {
    if (!tab) {
      navigation.navigate(screen as any);
    } else {
      tabNav?.navigate(tab, { screen });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>More</Text>

        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileLabel}>Signed in as</Text>
            <Text style={styles.profileEmail} numberOfLines={1}>{email}</Text>
          </View>
        </View>

        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.row, idx < section.items.length - 1 && styles.rowBorder]}
                  onPress={() => handlePress(item.tab, item.screen)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
                    <MaterialIcons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowLabel}>{item.label}</Text>
                    <Text style={styles.rowSub}>{item.sub}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={18} color="#4B4B4B" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0D0D0D' },
  content:      { padding: 20, gap: 20, paddingBottom: 40 },
  heading:      { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },

  profileCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: '#2C2C2C' },
  avatar:       { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8257E6', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:   { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  profileInfo:  { flex: 1 },
  profileLabel: { fontSize: 11, color: '#6B6B6B', marginBottom: 3 },
  profileEmail: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  section:      { gap: 8 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B6B6B', textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 4 },
  card:         { backgroundColor: '#1A1A1A', borderRadius: 16 },
  row:          { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowBorder:    { borderBottomWidth: 1, borderBottomColor: '#2C2C2C' },
  iconBox:      { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rowText:      { flex: 1 },
  rowLabel:     { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  rowSub:       { fontSize: 12, color: '#6B6B6B', marginTop: 1 },
});
