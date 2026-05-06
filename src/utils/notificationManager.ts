import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMinutes } from 'date-fns';

// ─── 알림 핸들러 설정 (앱 최상위에서 한 번 호출) ───────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── 타입 ────────────────────────────────────────────────────────────────────
export type ActionType = 'feed' | 'nap' | 'diaper';

export interface NotificationSettings {
  enabled: boolean;
  offsetMinutes: number; // 0 = 정시, -10 = 10분 전, 10 = 10분 후
  perBaby: {
    A: { feed: boolean; nap: boolean; diaper: boolean };
    B: { feed: boolean; nap: boolean; diaper: boolean };
  };
}

export const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  offsetMinutes: 0,
  perBaby: {
    A: { feed: true, nap: true, diaper: true },
    B: { feed: true, nap: true, diaper: true },
  },
};

// ─── Storage key ─────────────────────────────────────────────────────────────
const SETTINGS_KEY = '@notification_settings';
// identifier prefix per (baby, type): e.g. "alarm_A_feed"
const alarmKey = (baby: 'A' | 'B', type: ActionType) => `alarm_${baby}_${type}`;

// ─── 권한 요청 ────────────────────────────────────────────────────────────────
export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) {
    // 에뮬레이터는 push 알림 미지원 (인앱 팝업만 동작)
    return false;
  }

  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Android 알림 채널 생성 ───────────────────────────────────────────────────
export async function setupAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('twin-tracker-alarm', {
      name: '육아 알람',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: 'default',
    });
  }
}

// ─── 설정 불러오기 / 저장 ─────────────────────────────────────────────────────
export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveNotificationSettings(settings: NotificationSettings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ─── 알람 스케줄 등록 ─────────────────────────────────────────────────────────
/**
 * 마지막 기록 시간 + 가이드 분 + 오프셋 분 시각에 알림을 예약합니다.
 * 이미 지난 시간이면 등록하지 않습니다.
 */
export async function scheduleAlarm(
  baby: 'A' | 'B',
  babyName: string,
  type: ActionType,
  guideMinutes: number,
  lastTimestamp: string,
  settings: NotificationSettings
) {
  // 알림 꺼진 경우 스킵
  if (!settings.enabled) return;
  if (!settings.perBaby[baby][type]) return;

  const fireAt = addMinutes(new Date(lastTimestamp), guideMinutes + settings.offsetMinutes);
  const now = new Date();

  // 이미 지난 시간이면 스케줄 X
  if (fireAt <= now) return;

  const typeLabel: Record<ActionType, string> = {
    feed: '🍼 수유',
    nap: '💤 낮잠',
    diaper: '🧻 기저귀',
  };

  const offsetLabel =
    settings.offsetMinutes < 0
      ? ` (${Math.abs(settings.offsetMinutes)}분 전 알림)`
      : settings.offsetMinutes > 0
      ? ` (${settings.offsetMinutes}분 후 알림)`
      : '';

  // 이전 동일 알람 취소
  await cancelAlarm(baby, type);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: `👶 ${babyName} — ${typeLabel[type]} 시간!`,
      body: `${typeLabel[type]} 권장 시간이 되었습니다${offsetLabel}. 확인해주세요 🎉`,
      sound: 'default',
      data: { baby, type },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });

  // identifier를 저장해 두어 나중에 취소 가능하게
  await AsyncStorage.setItem(alarmKey(baby, type), identifier);
}

// ─── 알람 취소 ────────────────────────────────────────────────────────────────
export async function cancelAlarm(baby: 'A' | 'B', type: ActionType) {
  try {
    const key = alarmKey(baby, type);
    const identifier = await AsyncStorage.getItem(key);
    if (identifier) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      await AsyncStorage.removeItem(key);
    }
  } catch {
    // silent fail
  }
}

export async function cancelAllAlarms() {
  await Notifications.cancelAllScheduledNotificationsAsync();
  // clear stored identifiers
  const babies: Array<'A' | 'B'> = ['A', 'B'];
  const types: ActionType[] = ['feed', 'nap', 'diaper'];
  for (const b of babies) {
    for (const t of types) {
      await AsyncStorage.removeItem(alarmKey(b, t));
    }
  }
}
