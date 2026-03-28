import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MoreStackParamList } from '../types/navigation';
import MoreHomeScreen       from '../../screens/more/MoreHomeScreen';
import AboutScreen          from '../../screens/more/AboutScreen';
import PrivacyPolicyScreen  from '../../screens/more/PrivacyPolicyScreen';

const Stack = createNativeStackNavigator<MoreStackParamList>();

export default function MoreStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MoreHome"      component={MoreHomeScreen} />
      <Stack.Screen name="About"         component={AboutScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
    </Stack.Navigator>
  );
}
