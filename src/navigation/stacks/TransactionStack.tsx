import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TransactionStackParamList } from '../types/navigation';
import TransactionListScreen   from '../../screens/transactions/TransactionListScreen';
import TransactionDetailScreen from '../../screens/transactions/TransactionDetailScreen';
import AddTransactionScreen    from '../../screens/transactions/AddTransactionScreen';

const Stack = createNativeStackNavigator<TransactionStackParamList>();

export default function TransactionStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="TransactionList"   component={TransactionListScreen}   options={{ title: 'Transactions' }} />
      <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} options={{ title: 'Details' }} />
      <Stack.Screen name="AddTransaction"    component={AddTransactionScreen}    options={{ title: 'Add Transaction' }} />
    </Stack.Navigator>
  );
}
