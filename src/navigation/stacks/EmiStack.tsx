import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { EmiStackParamList } from '../types/navigation';
import EMIListScreen   from '../../screens/emi/EMIListScreen';
import EMIDetailScreen from '../../screens/emi/EMIDetailScreen';
import AddEMIScreen    from '../../screens/emi/AddEMIScreen';

const Stack = createNativeStackNavigator<EmiStackParamList>();

export default function EmiStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="EMIList"   component={EMIListScreen}   options={{ title: 'EMI Tracker' }} />
      <Stack.Screen name="EMIDetail" component={EMIDetailScreen} options={{ title: 'EMI Details' }} />
      <Stack.Screen name="AddEMI"    component={AddEMIScreen}    options={{ title: 'Add EMI' }} />
    </Stack.Navigator>
  );
}
