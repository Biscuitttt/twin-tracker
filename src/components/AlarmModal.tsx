import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionType } from '../utils/notificationManager';

interface AlarmItem {
  baby: 'A' | 'B';
  babyName: string;
  type: ActionType;
  overdueMinutes: number;
}

interface AlarmModalProps {
  visible: boolean;
  alarms: AlarmItem[];
  onRecord: (baby: 'A' | 'B', type: ActionType) => void;
  onDismiss: (baby: 'A' | 'B', type: ActionType) => void;
  onDismissAll: () => void;
}

const TYPE_CONFIG: Record<ActionType, { label: string; icon: string; color: string }> = {
  feed: { label: '수유', icon: 'baby-bottle', color: '#3B82F6' },
  nap: { label: '낮잠', icon: 'sleep', color: '#8B5CF6' },
  diaper: { label: '기저귀', icon: 'paper-roll', color: '#10B981' },
};

export default function AlarmModal({ visible, alarms, onRecord, onDismiss, onDismissAll }: AlarmModalProps) {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [visible]);

  if (!visible || alarms.length === 0) return null;

  const formatOverdue = (mins: number) => {
    if (mins <= 0) return '지금';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}시간 ${m}분 지남`;
    return `${m}분 지남`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <Animated.View style={[styles.card, { transform: [{ scale: pulseAnim }] }]}>
          {/* 헤더 */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="bell-ring" size={28} color="#F59E0B" />
            <Text style={styles.headerTitle}>⏰ 케어 시간 알람</Text>
          </View>

          {/* 알람 목록 */}
          {alarms.map((alarm, idx) => {
            const cfg = TYPE_CONFIG[alarm.type];
            return (
              <View key={`${alarm.baby}_${alarm.type}_${idx}`} style={styles.alarmRow}>
                <View style={[styles.iconCircle, { backgroundColor: cfg.color + '33' }]}>
                  <MaterialCommunityIcons name={cfg.icon as any} size={22} color={cfg.color} />
                </View>
                <View style={styles.alarmInfo}>
                  <Text style={styles.alarmBaby}>{alarm.babyName}</Text>
                  <Text style={styles.alarmType}>{cfg.label} — {formatOverdue(alarm.overdueMinutes)}</Text>
                </View>
                <View style={styles.alarmActions}>
                  {/* 바로 기록 */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: cfg.color }]}
                    onPress={() => onRecord(alarm.baby, alarm.type)}
                  >
                    <MaterialCommunityIcons name="check" size={16} color="#fff" />
                    <Text style={styles.actionBtnText}>기록</Text>
                  </TouchableOpacity>
                  {/* 닫기 */}
                  <TouchableOpacity
                    style={styles.dismissBtn}
                    onPress={() => onDismiss(alarm.baby, alarm.type)}
                  >
                    <MaterialCommunityIcons name="close" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* 전체 닫기 */}
          {alarms.length > 1 && (
            <TouchableOpacity style={styles.dismissAllBtn} onPress={onDismissAll}>
              <Text style={styles.dismissAllText}>모두 닫기</Text>
            </TouchableOpacity>
          )}
          {alarms.length === 1 && (
            <TouchableOpacity
              style={styles.dismissAllBtn}
              onPress={() => onDismiss(alarms[0].baby, alarms[0].type)}
            >
              <Text style={styles.dismissAllText}>닫기</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 380,
    borderWidth: 1,
    borderColor: '#F59E0B44',
    shadowColor: '#F59E0B',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
    gap: 10,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  alarmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alarmInfo: {
    flex: 1,
  },
  alarmBaby: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
  alarmType: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dismissBtn: {
    padding: 6,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dismissAllBtn: {
    marginTop: 6,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#334155',
    borderRadius: 10,
  },
  dismissAllText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
