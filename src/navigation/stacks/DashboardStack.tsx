import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardStackParamList } from '../types/navigation';
import DashboardScreen        from '../../screens/dashboard/DashboardScreen';
import SettingsScreen         from '../../screens/settings/SettingsScreen';
import SyncScreen             from '../../screens/settings/SyncScreen';
import AASetupScreen          from '../../screens/settings/AASetupScreen';
import EmailSetupScreen       from '../../screens/settings/EmailSetupScreen';
import AddTransactionScreen   from '../../screens/transactions/AddTransactionScreen';

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DashboardHome"  component={DashboardScreen} />
      <Stack.Screen name="Settings"       component={SettingsScreen} />
      <Stack.Screen name="Sync"           component={SyncScreen} />
      <Stack.Screen name="AASetup"        component={AASetupScreen} />
      <Stack.Screen name="EmailSetup"     component={EmailSetupScreen} />
      <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
    </Stack.Navigator>
  );
}
