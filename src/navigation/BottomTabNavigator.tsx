import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { BottomTabParamList } from './types/navigation';

import DashboardStackNavigator    from './stacks/DashboardStack';
import TransactionStackNavigator  from './stacks/TransactionStack';
import PlanStackNavigator         from './stacks/PlanStack';
import AnalyticsStackNavigator    from './stacks/AnalyticsStack';
import MoreStackNavigator         from './stacks/MoreStack';
import AccountStackNavigator      from './stacks/AccountStack';
import EmiStackNavigator          from './stacks/EmiStack';
import LedgerStackNavigator       from './stacks/LedgerStack';
import GroupStackNavigator        from './stacks/GroupStack';
import RentStackNavigator         from './stacks/RentStack';
import TaskStackNavigator         from './stacks/TaskStack';

const Tab = createBottomTabNavigator<BottomTabParamList>();

const ICONS: Record<string, string> = {
  Dashboard:    'home',
  Transactions: 'receipt-long',
  Plan:         'auto-awesome',
  Analytics:    'bar-chart',
  More:         'apps',
};

const LABELS: Record<string, string> = {
  Dashboard:    'Home',
  Transactions: 'Spends',
  Plan:         'Plan',
  Analytics:    'Analytics',
  More:         'More',
};

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, focused }) => (
          <View style={focused ? styles.activeIconWrap : styles.iconWrap}>
            <MaterialIcons
              name={ICONS[route.name] ?? 'circle'}
              size={22}
              color={color}
            />
          </View>
        ),
        tabBarLabel: LABELS[route.name] ?? route.name,
        tabBarActiveTintColor:   '#8257E6',
        tabBarInactiveTintColor: '#4B4B4B',
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
      })}
    >
      {/* ── Visible tabs ── */}
      <Tab.Screen name="Dashboard"    component={DashboardStackNavigator}   />
      <Tab.Screen name="Transactions" component={TransactionStackNavigator}  />
      <Tab.Screen name="Plan"         component={PlanStackNavigator}         />
      <Tab.Screen name="Analytics"    component={AnalyticsStackNavigator}    />
      <Tab.Screen name="More"         component={MoreStackNavigator}         />

      {/* ── Hidden tabs — reachable via More screen ── */}
      <Tab.Screen name="Accounts" component={AccountStackNavigator} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="EMI"      component={EmiStackNavigator}     options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Ledger"   component={LedgerStackNavigator}  options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Groups"   component={GroupStackNavigator}   options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Rent"     component={RentStackNavigator}    options={{ tabBarButton: () => null }} />
      <Tab.Screen name="Tasks"    component={TaskStackNavigator}    options={{ tabBarButton: () => null }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#111111',
    borderTopColor:  '#1A1A1A',
    borderTopWidth:  1,
    height:          72,
    paddingBottom:   10,
    paddingTop:      8,
  },
  tabItem: {
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 38,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrap: {
    width: 38,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3D2A6E',
    borderRadius: 10,
  },
});
