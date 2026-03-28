import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlanStackParamList } from '../types/navigation';

import PlanHomeScreen           from '../../screens/plan/PlanHomeScreen';
import BudgetPlannerScreen      from '../../screens/plan/BudgetPlannerScreen';
import AICoachScreen            from '../../screens/plan/AICoachScreen';
import InvestmentAnalyzerScreen from '../../screens/plan/InvestmentAnalyzerScreen';

const Stack = createNativeStackNavigator<PlanStackParamList>();

export default function PlanStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PlanHome"           component={PlanHomeScreen}           />
      <Stack.Screen name="BudgetPlanner"      component={BudgetPlannerScreen}      />
      <Stack.Screen name="AICoach"            component={AICoachScreen}            />
      <Stack.Screen name="InvestmentAnalyzer" component={InvestmentAnalyzerScreen} />
    </Stack.Navigator>
  );
}
