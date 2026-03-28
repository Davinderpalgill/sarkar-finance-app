import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import { CONSTANTS } from '../config/constants';

export async function createNotificationChannels(): Promise<void> {
  await notifee.createChannel({
    id: CONSTANTS.NOTIFICATION_CHANNEL_EMI,
    name: 'EMI Reminders',
    importance: AndroidImportance.HIGH,
  });
  await notifee.createChannel({
    id: CONSTANTS.NOTIFICATION_CHANNEL_LEDGER,
    name: 'Lend/Borrow Reminders',
    importance: AndroidImportance.HIGH,
  });
  await notifee.createChannel({
    id: CONSTANTS.NOTIFICATION_CHANNEL_GENERAL,
    name: 'General',
    importance: AndroidImportance.DEFAULT,
  });
}

export async function scheduleNotification(options: {
  id: string;
  title: string;
  body: string;
  channelId: string;
  triggerAt: number; // epoch ms
}): Promise<string> {
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: options.triggerAt,
  };
  const notifId = await notifee.createTriggerNotification(
    {
      id: options.id,
      title: options.title,
      body: options.body,
      android: { channelId: options.channelId, pressAction: { id: 'default' } },
    },
    trigger
  );
  return notifId;
}

export async function cancelNotification(id: string): Promise<void> {
  await notifee.cancelNotification(id);
}

export async function displayImmediateNotification(options: {
  title: string;
  body: string;
  channelId: string;
}): Promise<void> {
  await notifee.displayNotification({
    title: options.title,
    body: options.body,
    android: { channelId: options.channelId },
  });
}
