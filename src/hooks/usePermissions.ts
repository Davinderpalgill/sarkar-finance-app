import { useState } from 'react';
import { Platform } from 'react-native';
import { check, request, PERMISSIONS, RESULTS, Permission } from 'react-native-permissions';

type PermissionStatus = 'granted' | 'denied' | 'blocked' | 'unavailable' | 'limited';

interface PermissionState {
  readSms: PermissionStatus;
  receiveSms: PermissionStatus;
  readContacts: PermissionStatus;
  postNotifications: PermissionStatus;
}

export function usePermissions() {
  const [status, setStatus] = useState<PermissionState>({
    readSms: 'unavailable',
    receiveSms: 'unavailable',
    readContacts: 'unavailable',
    postNotifications: 'unavailable',
  });
  const [checking, setChecking] = useState(false);

  const checkAll = async () => {
    if (Platform.OS !== 'android') return;
    setChecking(true);
    const [readSms, receiveSms, readContacts, postNotifications] = await Promise.all([
      check(PERMISSIONS.ANDROID.READ_SMS),
      check(PERMISSIONS.ANDROID.RECEIVE_SMS),
      check(PERMISSIONS.ANDROID.READ_CONTACTS),
      check(PERMISSIONS.ANDROID.POST_NOTIFICATIONS),
    ]);
    setStatus({
      readSms:           mapResult(readSms),
      receiveSms:        mapResult(receiveSms),
      readContacts:      mapResult(readContacts),
      postNotifications: mapResult(postNotifications),
    });
    setChecking(false);
  };

  const requestAll = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const perms: Permission[] = [
      PERMISSIONS.ANDROID.READ_SMS,
      PERMISSIONS.ANDROID.RECEIVE_SMS,
      PERMISSIONS.ANDROID.READ_CONTACTS,
      PERMISSIONS.ANDROID.POST_NOTIFICATIONS,
    ];
    const results = await Promise.all(perms.map(p => request(p)));
    const allGranted = results.every(r => r === RESULTS.GRANTED);
    await checkAll();
    return allGranted;
  };

  const hasSmsPermission = () =>
    status.readSms === 'granted' && status.receiveSms === 'granted';

  return { status, checking, checkAll, requestAll, hasSmsPermission };
}

function mapResult(result: string): PermissionStatus {
  switch (result) {
    case RESULTS.GRANTED:     return 'granted';
    case RESULTS.DENIED:      return 'denied';
    case RESULTS.BLOCKED:     return 'blocked';
    case RESULTS.LIMITED:     return 'limited';
    default:                  return 'unavailable';
  }
}
