import { differenceInMinutes, formatDistanceToNow, addMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';

// 아기 기본 상태 (테스트용 하드코딩, 필요시 상태로 분리)
export const BABY_AGE_GROUP = '0_to_3_months'; // '0_to_3_months' | '4_to_6_months'

export const getGuideMinutes = (type: string, ageGroup: string = '0_to_3_months') => {
  if (type === 'feed') {
    return ageGroup === '0_to_3_months' ? 3 * 60 : 3.5 * 60; // 수유: 3시간
  } else if (type === 'nap') {
    return ageGroup === '0_to_3_months' ? 2 * 60 : 3 * 60; // 낮잠: 2시간
  } else if (type === 'diaper') {
    return 2.5 * 60; // 기저귀: 2시간 30분
  }
  return 3 * 60;
};

export const getNextGuideTime = (lastTimeStr: string, type: string) => {
  const guideMins = getGuideMinutes(type);
  const nextTime = addMinutes(new Date(lastTimeStr), guideMins);
  return nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const calculateTimeDiff = (lastTimeStr: string | null) => {
  if (!lastTimeStr) return null;
  const lastTime = new Date(lastTimeStr);
  const now = new Date();
  const diffMinutes = differenceInMinutes(now, lastTime);
  return diffMinutes;
};

export const getErrorRangeText = (diffMinutes: number | null, guideMinutes: number) => {
  if (diffMinutes === null) return "첫 기록입니다.";
  
  const errorMinutes = diffMinutes - guideMinutes;
  const hours = Math.floor(Math.abs(errorMinutes) / 60);
  const mins = Math.abs(errorMinutes) % 60;
  
  const timeStr = hours > 0 ? `${hours}시간 ${mins}분` : `${mins}분`;

  if (errorMinutes > 0) {
    return `오차: +${timeStr} (지연됨 🔴)`;
  } else if (errorMinutes < 0) {
    return `오차: -${timeStr} (일찍 🔵)`;
  } else {
    return `정시 기록 🟢`;
  }
};

export const formatElapsed = (lastTimeStr: string | null) => {
  if (!lastTimeStr) return '기록 없음';
  return formatDistanceToNow(new Date(lastTimeStr), { addSuffix: true, locale: ko });
};
