import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TaskStackParamList } from '../types/navigation';

import TaskHomeScreen      from '../../screens/tasks/TaskHomeScreen';
import TaskDetailScreen    from '../../screens/tasks/TaskDetailScreen';
import AddTaskScreen       from '../../screens/tasks/AddTaskScreen';
import TaskAnalyticsScreen from '../../screens/tasks/TaskAnalyticsScreen';
import AddHabitScreen      from '../../screens/tasks/AddHabitScreen';
import HabitDetailScreen   from '../../screens/tasks/HabitDetailScreen';

const Stack = createNativeStackNavigator<TaskStackParamList>();

export default function TaskStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TaskHome"      component={TaskHomeScreen}      />
      <Stack.Screen name="TaskDetail"    component={TaskDetailScreen}    />
      <Stack.Screen name="AddTask"       component={AddTaskScreen}       />
      <Stack.Screen name="TaskAnalytics" component={TaskAnalyticsScreen} />
      <Stack.Screen name="AddHabit"      component={AddHabitScreen}      />
      <Stack.Screen name="HabitDetail"   component={HabitDetailScreen}   />
    </Stack.Navigator>
  );
}
