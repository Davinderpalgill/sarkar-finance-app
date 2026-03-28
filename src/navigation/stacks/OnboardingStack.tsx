import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../types/navigation';
import WelcomeScreen         from '../../screens/onboarding/WelcomeScreen';
import EmailLoginScreen      from '../../screens/onboarding/EmailLoginScreen';
import MagicLinkWaitScreen   from '../../screens/onboarding/MagicLinkWaitScreen';
import PermissionsScreen     from '../../screens/onboarding/PermissionsScreen';
import ProfileSetupScreen    from '../../screens/onboarding/ProfileSetupScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome"        component={WelcomeScreen}       />
      <Stack.Screen name="EmailLogin"     component={EmailLoginScreen}    />
      <Stack.Screen name="MagicLinkWait"  component={MagicLinkWaitScreen} />
      <Stack.Screen name="Permissions"    component={PermissionsScreen}   />
      <Stack.Screen name="ProfileSetup"   component={ProfileSetupScreen}  />
    </Stack.Navigator>
  );
}
