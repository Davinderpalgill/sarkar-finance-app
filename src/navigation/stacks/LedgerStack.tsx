import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LedgerStackParamList } from '../types/navigation';
import LedgerScreen       from '../../screens/ledger/LedgerScreen';
import LedgerDetailScreen from '../../screens/ledger/LedgerDetailScreen';
import AddLendScreen      from '../../screens/ledger/AddLendScreen';

const Stack = createNativeStackNavigator<LedgerStackParamList>();

export default function LedgerStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="LedgerHome"   component={LedgerScreen}       options={{ title: 'Ledger' }} />
      <Stack.Screen name="LedgerDetail" component={LedgerDetailScreen} options={{ title: 'Entry Detail' }} />
      <Stack.Screen name="AddLend"      component={AddLendScreen}      options={{ title: 'Add Entry' }} />
    </Stack.Navigator>
  );
}
