import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateTimeDiff, getErrorRangeText, formatElapsed, getGuideMinutes, getNextGuideTime } from '../utils/timeCalculations';
import { checkSyncRecommendation } from '../utils/syncLogic';
import {
  requestNotificationPermission,
  setupAndroidChannel,
  loadNotificationSettings,
  saveNotificationSettings,
  scheduleAlarm,
  NotificationSettings,
  DEFAULT_SETTINGS,
  ActionType as NotiActionType,
} from '../utils/notificationManager';
import AlarmModal from './AlarmModal';
import NotificationSettingsModal from './NotificationSettingsModal';

type ActionType = 'feed' | 'nap' | 'diaper';

interface RecordItem {
  id: string;
  type: ActionType;
  timestamp: string;
}

interface AlarmItem {
  baby: 'A' | 'B';
  babyName: string;
  type: ActionType;
  overdueMinutes: number;
}

export default function Dashboard() {
  const [recordsA, setRecordsA] = useState<RecordItem[]>([]);
  const [recordsB, setRecordsB] = useState<RecordItem[]>([]);
  const [syncAlert, setSyncAlert] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());
  const [babyNameA, setBabyNameA] = useState('아기 A');
  const [babyNameB, setBabyNameB] = useState('아기 B');
  const [editingBaby, setEditingBaby] = useState<'A' | 'B' | null>(null);
  const [tempName, setTempName] = useState('');

  // ── 알람 상태
  const [activeAlarms, setActiveAlarms] = useState<AlarmItem[]>([]);
  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(new Set());
  const [notiSettings, setNotiSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [showNotiSettings, setShowNotiSettings] = useState(false);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    loadData();
    initNotifications();
  }, []);

  const initNotifications = async () => {
    await setupAndroidChannel();
    await requestNotificationPermission();
    const s = await loadNotificationSettings();
    setNotiSettings(s);
  };

  // ── 30초마다 알람 체크
  useEffect(() => {
    const interval = setInterval(() => checkAlarms(), 30000);
    checkAlarms();
    return () => clearInterval(interval);
  }, [recordsA, recordsB, babyNameA, babyNameB, notiSettings]);

  const checkAlarms = () => {
    if (!notiSettings.enabled) return;
    const now = new Date();
    const newAlarms: AlarmItem[] = [];

    const check = (baby: 'A' | 'B', records: RecordItem[], babyName: string) => {
      const types: ActionType[] = ['feed', 'nap', 'diaper'];
      types.forEach(type => {
        if (!notiSettings.perBaby[baby][type]) return;
        const todayRecords = records.filter(
          r => r.type === type && new Date(r.timestamp).toDateString() === now.toDateString()
        );
        if (todayRecords.length === 0) return;
        const latest = todayRecords[0];
        const guideMins = getGuideMinutes(type);
        const diffMins = calculateTimeDiff(latest.timestamp);
        if (diffMins === null) return;
        if (diffMins < guideMins) return;
        const key = `${baby}_${type}_${latest.id}`;
        if (dismissedRef.current.has(key)) return;
        newAlarms.push({
          baby,
          babyName,
          type,
          overdueMinutes: diffMins - guideMins,
        });
      });
    };

    check('A', recordsA, babyNameA);
    check('B', recordsB, babyNameB);
    setActiveAlarms(newAlarms);
  };

  const handleAlarmRecord = (baby: 'A' | 'B', type: ActionType) => {
    handleAction(baby, type);
    handleAlarmDismiss(baby, type);
  };

  const handleAlarmDismiss = (baby: 'A' | 'B', type: ActionType) => {
    const records = baby === 'A' ? recordsA : recordsB;
    const latest = records.filter(r => r.type === type)[0];
    if (latest) {
      const key = `${baby}_${type}_${latest.id}`;
      dismissedRef.current.add(key);
      setDismissedAlarms(new Set(dismissedRef.current));
    }
    setActiveAlarms(prev => prev.filter(a => !(a.baby === baby && a.type === type)));
  };

  const handleDismissAll = () => {
    activeAlarms.forEach(a => handleAlarmDismiss(a.baby, a.type));
  };

  const handleSaveNotiSettings = async (updated: NotificationSettings) => {
    setNotiSettings(updated);
    await saveNotificationSettings(updated);
    setShowNotiSettings(false);
  };

  const loadData = async () => {
    try {
      const [a, b, nameA, nameB] = await Promise.all([
        AsyncStorage.getItem('@records_a'),
        AsyncStorage.getItem('@records_b'),
        AsyncStorage.getItem('@baby_name_a'),
        AsyncStorage.getItem('@baby_name_b')
      ]);
      if (a) setRecordsA(JSON.parse(a));
      if (b) setRecordsB(JSON.parse(b));
      if (nameA) setBabyNameA(nameA);
      if (nameB) setBabyNameB(nameB);
    } catch (e) {
      console.error(e);
    }
  };

  const saveBabyName = async () => {
    if (editingBaby && tempName.trim()) {
      const key = editingBaby === 'A' ? '@baby_name_a' : '@baby_name_b';
      await AsyncStorage.setItem(key, tempName.trim());
      if (editingBaby === 'A') setBabyNameA(tempName.trim());
      else setBabyNameB(tempName.trim());
    }
    setEditingBaby(null);
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = new Date().toDateString() === selectedDate.toDateString();
  const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토'];
  const dayOfWeek = DAYS_KR[selectedDate.getDay()];
  const isSunday = selectedDate.getDay() === 0;
  const dateString = `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 ${selectedDate.getDate()}일`;

  // ---- Calendar helpers ----
  const openCalendar = () => {
    setCalendarViewDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    setShowCalendar(true);
  };

  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const today = new Date();

  const calendarCells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad to full weeks
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  const selectCalendarDate = (day: number) => {
    const picked = new Date(calendarYear, calendarMonth, day);
    setSelectedDate(picked);
    setShowCalendar(false);
  };

  const changeCalendarMonth = (delta: number) => {
    setCalendarViewDate(new Date(calendarYear, calendarMonth + delta, 1));
  };

  const getFilteredRecords = (records: RecordItem[]) => {
    return records.filter(r => new Date(r.timestamp).toDateString() === selectedDate.toDateString());
  };

  const saveData = async (baby: 'A' | 'B', newRecords: RecordItem[]) => {
    try {
      if (baby === 'A') {
        setRecordsA(newRecords);
        await AsyncStorage.setItem('@records_a', JSON.stringify(newRecords));
      } else {
        setRecordsB(newRecords);
        await AsyncStorage.setItem('@records_b', JSON.stringify(newRecords));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getLastAction = (records: RecordItem[], type: ActionType) => {
    return records.find(r => r.type === type)?.timestamp || null;
  };

  const handleAction = (baby: 'A' | 'B', actionType: ActionType) => {
    const now = new Date().toISOString();
    const newRecord: RecordItem = {
      id: Math.random().toString(),
      type: actionType,
      timestamp: now,
    };

    if (baby === 'A') {
      const updated = [newRecord, ...recordsA];
      saveData('A', updated);
      // 다음 가이드 시간에 알람 스케줄
      scheduleAlarm('A', babyNameA, actionType, getGuideMinutes(actionType), now, notiSettings);
      if (actionType === 'feed' || actionType === 'nap') {
        const otherLastTime = getLastAction(recordsB, actionType);
        if (checkSyncRecommendation(otherLastTime, new Date())) {
          setSyncAlert(`⚠️ 동기화 권장: 아기 B도 30분 이내에 ${actionType === 'feed' ? '수유를 시작' : '깨우는 것'}을 권장합니다.`);
          setTimeout(() => setSyncAlert(null), 5000);
        }
      }
    } else {
      const updated = [newRecord, ...recordsB];
      saveData('B', updated);
      // 다음 가이드 시간에 알람 스케줄
      scheduleAlarm('B', babyNameB, actionType, getGuideMinutes(actionType), now, notiSettings);
      if (actionType === 'feed' || actionType === 'nap') {
        const otherLastTime = getLastAction(recordsA, actionType);
        if (checkSyncRecommendation(otherLastTime, new Date())) {
          setSyncAlert(`⚠️ 동기화 권장: 아기 A도 30분 이내에 ${actionType === 'feed' ? '수유를 시작' : '깨우는 것'}을 권장합니다.`);
          setTimeout(() => setSyncAlert(null), 5000);
        }
      }
    }
  };

  const handleDelete = (baby: 'A' | 'B', id: string) => {
    Alert.alert('기록 삭제', '이 기록을 지우시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { 
        text: '삭제', 
        style: 'destructive',
        onPress: () => {
          if (baby === 'A') {
            const newRecords = recordsA.filter(r => r.id !== id);
            saveData('A', newRecords);
          } else {
            const newRecords = recordsB.filter(r => r.id !== id);
            saveData('B', newRecords);
          }
        }
      }
    ]);
  };

  const renderInfoRow = (records: RecordItem[], type: ActionType, icon: string, title: string) => {
    const lastTime = getLastAction(records, type);
    const guideMins = getGuideMinutes(type);
    const diffMins = calculateTimeDiff(lastTime);
    const errorText = getErrorRangeText(diffMins, guideMins);
    const elapsedText = formatElapsed(lastTime);

    return (
      <View style={styles.infoRow} key={type}>
        <Text style={styles.infoRowTitle}>{icon} {title}</Text>
        <View style={styles.infoRowRight}>
          <Text style={styles.infoRowText}>{elapsedText} (권장: {guideMins/60}h)</Text>
          <Text style={[styles.errorText, diffMins && diffMins > guideMins ? styles.textRed : diffMins !== null ? styles.textBlue : null]}>
            {errorText}
          </Text>
        </View>
      </View>
    );
  };

  const renderBabyColumn = (baby: 'A' | 'B', records: RecordItem[]) => {
    const filteredRecords = getFilteredRecords(records);
    const babyName = baby === 'A' ? babyNameA : babyNameB;

    return (
      <View style={styles.column}>
        <TouchableOpacity onPress={() => { setTempName(babyName); setEditingBaby(baby); }}>
          <Text style={styles.babyTitle}>{babyName} ✏️</Text>
        </TouchableOpacity>
        
        <View style={styles.infoCard}>
          {renderInfoRow(filteredRecords, 'feed', '🍼', '수유')}
          <View style={styles.rowDivider} />
          {renderInfoRow(filteredRecords, 'nap', '💤', '낮잠')}
          <View style={styles.rowDivider} />
          {renderInfoRow(filteredRecords, 'diaper', '🧻', '기저귀')}
        </View>

        <ScrollView style={styles.timeline}>
          {filteredRecords.map((r) => (
            <View key={r.id} style={styles.recordItem}>
              <MaterialCommunityIcons 
                name={r.type === 'feed' ? 'baby-bottle' : r.type === 'nap' ? 'sleep' : 'paper-roll'} 
                size={20} 
                color="#E2E8F0" 
              />
              <View style={styles.recordTextContainer}>
                <Text style={styles.recordTime}>
                  {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
                <Text style={styles.recordGuideTime}>
                  (다음 권장: {getNextGuideTime(r.timestamp, r.type)})
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(baby, r.id)} style={styles.deleteBtn}>
                <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {isToday ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.actionBtn, styles.btnFeed]} onPress={() => handleAction(baby, 'feed')}>
              <MaterialCommunityIcons name="baby-bottle-outline" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnNap]} onPress={() => handleAction(baby, 'nap')}>
              <MaterialCommunityIcons name="sleep" size={28} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.btnDiaper]} onPress={() => handleAction(baby, 'diaper')}>
              <MaterialCommunityIcons name="paper-roll" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.buttonContainer, {justifyContent: 'center', height: 48}]}>
            <Text style={{color: '#64748B', fontSize: 12}}>과거 기록 추가는 불가능합니다.</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.dateHeader}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
          <Text style={styles.dateArrow}>◀</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openCalendar} style={styles.dateTitleBtn}>
          <Text style={styles.dateText}>
            {dateString}
            <Text style={[styles.dayOfWeek, isSunday && styles.dayOfWeekSunday]}> ({dayOfWeek})</Text>
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => changeDate(1)} disabled={isToday} style={styles.dateBtn}>
          <Text style={[styles.dateArrow, { opacity: isToday ? 0.3 : 1 }]}>▶</Text>
        </TouchableOpacity>
        {/* 알림 설정 버튼 */}
        <TouchableOpacity onPress={() => setShowNotiSettings(true)} style={styles.bellBtn}>
          <MaterialCommunityIcons
            name={notiSettings.enabled ? 'bell' : 'bell-off'}
            size={22}
            color={notiSettings.enabled ? '#F59E0B' : '#475569'}
          />
          {activeAlarms.length > 0 && (
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>{activeAlarms.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {syncAlert && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{syncAlert}</Text>
        </View>
      )}
      <View style={styles.splitView}>
        {renderBabyColumn('A', recordsA)}
        <View style={styles.divider} />
        {renderBabyColumn('B', recordsB)}
      </View>

      <Modal visible={showCalendar} transparent animationType="fade">
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
            <View style={styles.calendarBox}>
              {/* Calendar header */}
              <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => changeCalendarMonth(-1)} style={styles.calMonthBtn}>
                  <Text style={styles.calMonthArrow}>◀</Text>
                </TouchableOpacity>
                <Text style={styles.calMonthTitle}>{calendarYear}년 {calendarMonth + 1}월</Text>
                <TouchableOpacity onPress={() => changeCalendarMonth(1)} style={styles.calMonthBtn}>
                  <Text style={styles.calMonthArrow}>▶</Text>
                </TouchableOpacity>
              </View>
              {/* Day labels */}
              <View style={styles.calDayLabels}>
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                  <Text key={d} style={[styles.calDayLabel, i === 0 && { color: '#EF4444' }]}>{d}</Text>
                ))}
              </View>
              {/* Calendar grid */}
              <View style={styles.calGrid}>
                {calendarCells.map((day, idx) => {
                  if (!day) return <View key={idx} style={styles.calCell} />;
                  const cellDate = new Date(calendarYear, calendarMonth, day);
                  const isSelected = cellDate.toDateString() === selectedDate.toDateString();
                  const isTodayCell = cellDate.toDateString() === today.toDateString();
                  const isFuture = cellDate > today;
                  const isSun = idx % 7 === 0;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.calCell, isSelected && styles.calCellSelected]}
                      onPress={() => !isFuture && selectCalendarDate(day)}
                      disabled={isFuture}
                    >
                      <Text style={[
                        styles.calCellText,
                        isSun && styles.calCellSunday,
                        isTodayCell && styles.calCellToday,
                        isSelected && styles.calCellSelectedText,
                        isFuture && { opacity: 0.25 },
                      ]}>{day}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                style={styles.calTodayBtn}
                onPress={() => { setSelectedDate(new Date()); setShowCalendar(false); }}
              >
                <Text style={styles.calTodayBtnText}>오늘로 이동</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!editingBaby} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>아기 이름 변경</Text>
            <TextInput
              style={styles.modalInput}
              value={tempName}
              onChangeText={setTempName}
              autoFocus
              maxLength={10}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setEditingBaby(null)} style={styles.modalBtn}>
                <Text style={styles.modalBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveBabyName} style={[styles.modalBtn, {backgroundColor: '#3B82F6'}]}>
                <Text style={[styles.modalBtnText, {color: 'white'}]}>저장</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 인앱 알람 팝업 */}
      <AlarmModal
        visible={activeAlarms.length > 0}
        alarms={activeAlarms}
        onRecord={handleAlarmRecord}
        onDismiss={handleAlarmDismiss}
        onDismissAll={handleDismissAll}
      />

      {/* 알림 설정 모달 */}
      <NotificationSettingsModal
        visible={showNotiSettings}
        settings={notiSettings}
        onSave={handleSaveNotiSettings}
        onClose={() => setShowNotiSettings(false)}
        babyNameA={babyNameA}
        babyNameB={babyNameB}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A', // 다크모드 기본 배경
    paddingTop: 10,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    marginBottom: 10,
  },
  dateBtn: {
    padding: 10,
  },
  bellBtn: {
    padding: 8,
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateArrow: {
    color: '#3B82F6',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateTitleBtn: {
    flex: 1,
    alignItems: 'center',
  },
  dayOfWeek: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#94A3B8',
  },
  dayOfWeekSunday: {
    color: '#EF4444',
  },
  // ---- Calendar modal styles ----
  calendarBox: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    width: 300,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  calMonthBtn: {
    padding: 8,
  },
  calMonthArrow: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calMonthTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  calDayLabels: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  calDayLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: `${100 / 7}%` as any,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 100,
  },
  calCellSelected: {
    backgroundColor: '#3B82F6',
  },
  calCellText: {
    color: '#F8FAFC',
    fontSize: 13,
  },
  calCellSunday: {
    color: '#EF4444',
  },
  calCellToday: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  calCellSelectedText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  calTodayBtn: {
    marginTop: 12,
    backgroundColor: '#334155',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calTodayBtnText: {
    color: '#F8FAFC',
    fontWeight: 'bold',
    fontSize: 14,
  },
  alertBanner: {
    backgroundColor: '#F59E0B',
    padding: 12,
    alignItems: 'center',
    zIndex: 10,
  },
  alertText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  splitView: {
    flex: 1,
    flexDirection: 'row',
  },
  divider: {
    width: 1,
    backgroundColor: '#334155',
  },
  column: {
    flex: 1,
    padding: 10,
  },
  babyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 10,
  },
  infoCard: {
    backgroundColor: '#1E293B',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoRowTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  infoRowRight: {
    alignItems: 'flex-end',
  },
  infoRowText: {
    color: '#F8FAFC',
    fontSize: 12,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  errorText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  textRed: { color: '#EF4444' },
  textBlue: { color: '#3B82F6' },
  timeline: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#334155',
    borderRadius: 6,
  },
  recordTextContainer: {
    flex: 1,
    flexDirection: 'column',
    marginLeft: 8,
  },
  recordTime: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  recordGuideTime: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFeed: { backgroundColor: '#3B82F6' }, // 파란색
  btnNap: { backgroundColor: '#8B5CF6' }, // 보라색
  btnDiaper: { backgroundColor: '#10B981' }, // 초록색
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
    backgroundColor: '#334155',
  },
  modalBtnText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
