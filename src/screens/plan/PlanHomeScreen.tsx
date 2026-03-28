import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../../navigation/types/navigation';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Props = { navigation: NativeStackNavigationProp<PlanStackParamList, 'PlanHome'> };

const CARDS = [
  {
    screen:   'BudgetPlanner' as const,
    icon:     'pie-chart',
    color:    '#6366F1',
    title:    'Budget Planner',
    desc:     '50/30/20 rule applied to your real income & spending. See exactly where to cut and how much to save.',
  },
  {
    screen:   'AICoach' as const,
    icon:     'smart-toy',
    color:    '#10B981',
    title:    'AI Financial Coach',
    desc:     'Chat with Llama 3.1 about your finances. Get personalised SIP, tax-saving, and emergency fund advice.',
  },
  {
    screen:   'InvestmentAnalyzer' as const,
    icon:     'trending-up',
    color:    '#F59E0B',
    title:    'Investment Analyzer',
    desc:     'Live data on stocks, gold, silver & real estate — with AI-powered sector analysis and recommendations.',
  },
];

export default function PlanHomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Wealth Planner</Text>
        <Text style={styles.sub}>AI-powered budgeting, coaching, and investment insights tailored to your finances.</Text>

        {CARDS.map(card => (
          <TouchableOpacity
            key={card.screen}
            style={styles.card}
            onPress={() => navigation.navigate(card.screen)}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: card.color + '22' }]}>
              <MaterialIcons name={card.icon} size={28} color={card.color} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{card.title}</Text>
              <Text style={styles.cardDesc}>{card.desc}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color="#4B4B4B" />
          </TouchableOpacity>
        ))}

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={14} color="#4B4B4B" />
          <Text style={styles.noteText}>
            AI features use Groq (Llama 3.1). Market data via Yahoo Finance. Configure your API key in Settings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D0D0D' },
  content:   { padding: 20, gap: 16, paddingBottom: 40 },
  heading:   { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  sub:       { fontSize: 14, color: '#6B6B6B', lineHeight: 20 },
  card:      { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  iconBox:   { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardText:  { flex: 1, gap: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  cardDesc:  { fontSize: 13, color: '#6B6B6B', lineHeight: 18 },
  note:      { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 8 },
  noteText:  { fontSize: 11, color: '#4B4B4B', flex: 1, lineHeight: 16 },
});
