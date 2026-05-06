import { differenceInMinutes } from 'date-fns';

/**
 * 동기화 권장 알림 여부 확인 로직
 * 한 아기의 행동이 일어났을 때, 다른 아기가 동일 행동을 아직 하지 않았거나
 * 너무 오래전에 했다면(30분 초과) 알림을 표시해야 함.
 * @param otherBabyLastActionTime 다른 아기의 마지막 액션 시간
 * @param currentActionTime 현재 액션을 기록하는 시간
 * @returns 알림 배너 표시 여부 (true면 표시)
 */
export const checkSyncRecommendation = (
  otherBabyLastActionTime: string | null,
  currentActionTime: Date = new Date()
) => {
  if (!otherBabyLastActionTime) {
    // 상대방 기록이 없으면 무조건 동기화 권장
    return true;
  }

  const otherTime = new Date(otherBabyLastActionTime);
  const diffMinutes = Math.abs(differenceInMinutes(currentActionTime, otherTime));

  // 다른 아기의 행동이 30분 이상 차이나면 동기화 권장
  if (diffMinutes >= 30) {
    return true;
  }

  return false;
};
