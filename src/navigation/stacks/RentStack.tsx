import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RentStackParamList } from '../types/navigation';

import RentHomeScreen          from '../../screens/rent/RentHomeScreen';
import BuildingListScreen      from '../../screens/rent/BuildingListScreen';
import BuildingDetailScreen    from '../../screens/rent/BuildingDetailScreen';
import AddBuildingScreen       from '../../screens/rent/AddBuildingScreen';
import UnitTenantsScreen       from '../../screens/rent/UnitTenantsScreen';
import TenantDetailScreen      from '../../screens/rent/TenantDetailScreen';
import EditTenantScreen        from '../../screens/rent/EditTenantScreen';
import AddTenantScreen         from '../../screens/rent/AddTenantScreen';
import RentCollectionScreen    from '../../screens/rent/RentCollectionScreen';
import RecordRentScreen        from '../../screens/rent/RecordRentScreen';
import TenantStatementScreen   from '../../screens/rent/TenantStatementScreen';
import MaintenanceLogsScreen   from '../../screens/rent/MaintenanceLogsScreen';
import AddMaintenanceScreen    from '../../screens/rent/AddMaintenanceScreen';
import RentSummaryScreen       from '../../screens/rent/RentSummaryScreen';

const Stack = createNativeStackNavigator<RentStackParamList>();

export default function RentStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RentHome"          component={RentHomeScreen}         />
      <Stack.Screen name="BuildingList"      component={BuildingListScreen}     />
      <Stack.Screen name="BuildingDetail"    component={BuildingDetailScreen}   />
      <Stack.Screen name="AddBuilding"       component={AddBuildingScreen}      />
      <Stack.Screen name="UnitTenants"       component={UnitTenantsScreen}      />
      <Stack.Screen name="TenantDetail"      component={TenantDetailScreen}     />
      <Stack.Screen name="EditTenant"        component={EditTenantScreen}       />
      <Stack.Screen name="AddTenant"         component={AddTenantScreen}        />
      <Stack.Screen name="RentCollection"    component={RentCollectionScreen}   />
      <Stack.Screen name="RecordRent"        component={RecordRentScreen}       />
      <Stack.Screen name="TenantStatement"   component={TenantStatementScreen}  />
      <Stack.Screen name="MaintenanceLogs"   component={MaintenanceLogsScreen}  />
      <Stack.Screen name="AddMaintenance"    component={AddMaintenanceScreen}   />
      <Stack.Screen name="RentSummary"       component={RentSummaryScreen}      />
    </Stack.Navigator>
  );
}
