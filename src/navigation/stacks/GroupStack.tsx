import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GroupStackParamList } from '../types/navigation';
import GroupListScreen   from '../../screens/groups/GroupListScreen';
import GroupDetailScreen from '../../screens/groups/GroupDetailScreen';
import AddGroupScreen    from '../../screens/groups/AddGroupScreen';
import AddExpenseScreen  from '../../screens/groups/AddExpenseScreen';

const Stack = createNativeStackNavigator<GroupStackParamList>();

export default function GroupStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="GroupList"   component={GroupListScreen}   options={{ title: 'Groups' }} />
      <Stack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group' }} />
      <Stack.Screen name="AddGroup"    component={AddGroupScreen}    options={{ title: 'New Group' }} />
      <Stack.Screen name="AddExpense"  component={AddExpenseScreen}  options={{ title: 'Add Expense' }} />
    </Stack.Navigator>
  );
}
