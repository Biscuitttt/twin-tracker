import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { NotificationSettings, cancelAllAlarms, ActionType } from '../utils/notificationManager';

interface Props {
  visible: boolean;
  settings: NotificationSettings;
  onSave: (updated: NotificationSettings) => void;
  onClose: () => void;
  babyNameA: string;
  babyNameB: string;
}

const TYPE_LABELS: Record<ActionType, { label: string; icon: string; color: string }> = {
  feed: { label: '수유', icon: 'baby-bottle', color: '#3B82F6' },
  nap: { label: '낮잠', icon: 'sleep', color: '#8B5CF6' },
  diaper: { label: '기저귀', icon: 'paper-roll', color: '#10B981' },
};

const OFFSET_OPTIONS = [
  { label: '10분 전', value: -10 },
  { label: '5분 전', value: -5 },
  { label: '정시', value: 0 },
  { label: '5분 후', value: 5 },
  { label: '10분 후', value: 10 },
];

export default function NotificationSettingsModal({
  visible, settings, onSave, onClose, babyNameA, babyNameB,
}: Props) {
  const [local, setLocal] = useState<NotificationSettings>(settings);

  React.useEffect(() => {
    setLocal(settings);
  }, [settings, visible]);

  const toggleGlobal = (val: boolean) =>
    setLocal(prev => ({ ...prev, enabled: val }));

  const toggleBabyType = (baby: 'A' | 'B', type: ActionType, val: boolean) =>
    setLocal(prev => ({
      ...prev,
      perBaby: {
        ...prev.perBaby,
        [baby]: { ...prev.perBaby[baby], [type]: val },
      },
    }));

  const handleCancelAll = async () => {
    await cancelAllAlarms();
  };

  const babyName = (baby: 'A' | 'B') => (baby === 'A' ? babyNameA : babyNameB);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* 헤더 */}
          <View style={styles.header}>
            <MaterialCommunityIcons name="bell-cog" size={24} color="#3B82F6" />
            <Text style={styles.headerTitle}>알림 설정</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* 전체 알림 ON/OFF */}
            <View style={styles.section}>
              <View style={styles.rowBetween}>
                <View style={styles.rowLeft}>
                  <MaterialCommunityIcons name="bell" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>전체 알림</Text>
                </View>
                <Switch
                  value={local.enabled}
                  onValueChange={toggleGlobal}
                  trackColor={{ false: '#334155', true: '#3B82F6' }}
                  thumbColor={local.enabled ? '#fff' : '#64748B'}
                />
              </View>
              <Text style={styles.sectionDesc}>꺼두면 모든 알림이 비활성화됩니다.</Text>
            </View>

            {/* 알림 타이밍 */}
            <View style={[styles.section]}>
              <View style={[styles.rowLeft, { marginBottom: 10 }]}>
                <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />
                <Text style={[styles.sectionTitle, { marginLeft: 6 }]}>알림 타이밍</Text>
              </View>
              <View style={styles.offsetRow}>
                {OFFSET_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.offsetChip,
                      local.offsetMinutes === opt.value && styles.offsetChipActive,
                    ]}
                    onPress={() => setLocal(prev => ({ ...prev, offsetMinutes: opt.value }))}
                    disabled={!local.enabled}
                  >
                    <Text
                      style={[
                        styles.offsetChipText,
                        local.offsetMinutes === opt.value && styles.offsetChipTextActive,
                        !local.enabled && { opacity: 0.4 },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sectionDesc}>권장 시간 기준으로 얼마나 일찍 알릴지 설정합니다.</Text>
            </View>

            {/* 아기별 설정 */}
            {(['A', 'B'] as const).map(baby => (
              <View style={styles.section} key={baby}>
                <Text style={styles.babyLabel}>👶 {babyName(baby)}</Text>
                {(Object.entries(TYPE_LABELS) as [ActionType, typeof TYPE_LABELS[ActionType]][]).map(([type, cfg]) => (
                  <View style={styles.rowBetween} key={type}>
                    <View style={styles.rowLeft}>
                      <View style={[styles.typeIcon, { backgroundColor: cfg.color + '33' }]}>
                        <MaterialCommunityIcons name={cfg.icon as any} size={16} color={cfg.color} />
                      </View>
                      <Text style={[styles.typeLabel, (!local.enabled) && { opacity: 0.4 }]}>
                        {cfg.label}
                      </Text>
                    </View>
                    <Switch
                      value={local.perBaby[baby][type]}
                      onValueChange={val => toggleBabyType(baby, type, val)}
                      trackColor={{ false: '#334155', true: cfg.color }}
                      thumbColor={local.perBaby[baby][type] ? '#fff' : '#64748B'}
                      disabled={!local.enabled}
                    />
                  </View>
                ))}
              </View>
            ))}

            {/* 전체 알람 취소 버튼 */}
            <TouchableOpacity style={styles.cancelAllBtn} onPress={handleCancelAll}>
              <MaterialCommunityIcons name="bell-off" size={18} color="#EF4444" />
              <Text style={styles.cancelAllText}>예약된 알람 전체 취소</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* 저장 버튼 */}
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(local)}>
            <Text style={styles.saveBtnText}>저장</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 4,
  },
  section: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  sectionDesc: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  offsetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  offsetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  offsetChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  offsetChipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  offsetChipTextActive: {
    color: '#fff',
  },
  babyLabel: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 10,
  },
  typeIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeLabel: {
    color: '#F8FAFC',
    fontSize: 14,
    marginLeft: 6,
  },
  cancelAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#EF444444',
    borderRadius: 12,
    paddingVertical: 13,
    marginBottom: 4,
  },
  cancelAllText: {
    color: '#EF4444',
    fontWeight: 'bold',
    fontSize: 14,
  },
  saveBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
