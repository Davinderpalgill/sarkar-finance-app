import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AccountStackParamList } from '../types/navigation';
import AccountsScreen from '../../screens/accounts/AccountsScreen';

const Stack = createNativeStackNavigator<AccountStackParamList>();

export default function AccountStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="AccountList"
        component={AccountsScreen}
        options={{ title: 'My Accounts' }}
      />
    </Stack.Navigator>
  );
}
