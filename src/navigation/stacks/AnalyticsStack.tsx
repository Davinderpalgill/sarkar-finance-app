import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AnalyticsStackParamList } from '../types/navigation';

import AnalyticsHomeScreen        from '../../screens/analytics/AnalyticsHomeScreen';
import CategoryBreakdownScreen    from '../../screens/analytics/CategoryBreakdownScreen';
import TopMerchantsScreen         from '../../screens/analytics/TopMerchantsScreen';
import SavingsRateScreen          from '../../screens/analytics/SavingsRateScreen';
import BudgetScreen               from '../../screens/analytics/BudgetScreen';
import CashFlowCalendarScreen     from '../../screens/analytics/CashFlowCalendarScreen';
import RecurringTransactionsScreen from '../../screens/analytics/RecurringTransactionsScreen';
import EMIBurdenScreen            from '../../screens/analytics/EMIBurdenScreen';
import CategoryTrendsScreen       from '../../screens/analytics/CategoryTrendsScreen';
import CustomRangeReportScreen    from '../../screens/analytics/CustomRangeReportScreen';
import YearOverYearScreen         from '../../screens/analytics/YearOverYearScreen';
import NetWorthScreen             from '../../screens/analytics/NetWorthScreen';
import IncomeAnalysisScreen       from '../../screens/analytics/IncomeAnalysisScreen';
import LedgerAgingScreen          from '../../screens/analytics/LedgerAgingScreen';
import SpendingPatternsScreen         from '../../screens/analytics/SpendingPatternsScreen';
import CategoryTransactionsScreen    from '../../screens/analytics/CategoryTransactionsScreen';

const Stack = createNativeStackNavigator<AnalyticsStackParamList>();

export default function AnalyticsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AnalyticsHome"          component={AnalyticsHomeScreen} />
      <Stack.Screen name="CategoryBreakdown"      component={CategoryBreakdownScreen} />
      <Stack.Screen name="CategoryTransactions"   component={CategoryTransactionsScreen} />
      <Stack.Screen name="TopMerchants"           component={TopMerchantsScreen} />
      <Stack.Screen name="SavingsRate"            component={SavingsRateScreen} />
      <Stack.Screen name="Budget"                 component={BudgetScreen} />
      <Stack.Screen name="CashFlowCalendar"       component={CashFlowCalendarScreen} />
      <Stack.Screen name="RecurringTransactions"  component={RecurringTransactionsScreen} />
      <Stack.Screen name="EMIBurden"              component={EMIBurdenScreen} />
      <Stack.Screen name="CategoryTrends"         component={CategoryTrendsScreen} />
      <Stack.Screen name="CustomRangeReport"      component={CustomRangeReportScreen} />
      <Stack.Screen name="YearOverYear"           component={YearOverYearScreen} />
      <Stack.Screen name="NetWorth"               component={NetWorthScreen} />
      <Stack.Screen name="IncomeAnalysis"         component={IncomeAnalysisScreen} />
      <Stack.Screen name="LedgerAging"            component={LedgerAgingScreen} />
      <Stack.Screen name="SpendingPatterns"       component={SpendingPatternsScreen} />
    </Stack.Navigator>
  );
}
