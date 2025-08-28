import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useWebSocket } from '../context/WebSocketContext';

type RowKey = string; // `${id}|${dlc}|${data}`

type RowItem = {
  key: RowKey;
  id: string; // hex uppercase
  dlc: number;
  data: string; // "AA BB ..."
  type: string; // STD, EXT, STD:RTR, ...
  ms: number; // stream-provided ms timestamp
  lastSeen: number; // ms
  displayLastSeen: number; // for hold freeze
  count: number;
  expect: boolean;
  holdExpect: boolean;
  hidden: boolean;
  matches: number; // count of matches while expected/held
};

const GREEN_MS = 1000;
const YELLOW_MS = 5000;
const RED_MS = 30000;

const Sniff: React.FC = () => {
  const { getSelectedServerUrl } = useSettings();
  const { addMessageListener } = useWebSocket();
  const selectedServerUrl = getSelectedServerUrl();

  const rowsMapRef = useRef<Map<RowKey, RowItem>>(new Map());
  const ignoreSetRef = useRef<Set<RowKey>>(new Set());

  const [rows, setRows] = useState<RowItem[]>([]);
  const [showHidden, setShowHidden] = useState<boolean>(false);
  const [changingFirst, setChangingFirst] = useState<boolean>(false);
  const [holdOn, setHoldOn] = useState<boolean>(false);
  const holdOnRef = useRef<boolean>(false);
  const [expectCapturing, setExpectCapturing] = useState<boolean>(false);
  const expectCapturingRef = useRef<boolean>(false);
  const [normalHeld, setNormalHeld] = useState<boolean>(false);
  const normalHeldRef = useRef<boolean>(false);
  const [msgRate, setMsgRate] = useState<number>(0);
  const rateCounterRef = useRef<number>(0);
  const captureSetRef = useRef<Set<RowKey>>(new Set());

  // One-time info alert: status + plan per spec
  useEffect(() => {
    Alert.alert(
      'Sniffer status & plan',
      [
        'Working now:',
        '- Streaming, deduped rows, age colors, actions (expect/hold/ignore/hide).',
        '- Hold (blacklist): hides non-whitelisted frames; whitelisted stay visible.',
        '- Expect (hold): captures a whitelist and replaces the previous one.',
        '',
        'Not yet matching your spec:',
        '- Expect does not yet temporarily disable Hold while pressed.',
        '- Normal should be the default (no filtering) state; handled when Hold is off.',
        '- Performance needs tuning for long sessions.',
        '',
        'Plan (exactly as you defined):',
        '- Toggle switch: Normal (default, no filtering) | Hold (blacklist).',
        '- Expect is a press-and-hold button:',
        '  • On finger down: disable Hold and capture incoming frames into a whitelist.',
        '  • On finger up: re-enable Hold and apply the new whitelist (hide others).',
        '- Whitelisted messages can never be hidden.',
      ].join('\n')
    );
  }, []);

  useEffect(() => { holdOnRef.current = holdOn; }, [holdOn]);
  useEffect(() => { expectCapturingRef.current = expectCapturing; }, [expectCapturing]);
  useEffect(() => { normalHeldRef.current = normalHeld; }, [normalHeld]);

  // Accept incoming WS frames and update refs without re-render per frame
  useEffect(() => {
    const unsubscribe = addMessageListener((line) => {
      const parsed = parseCsvLine(line);
      if (!parsed) return;
      const { id, dlc, data, type, ms } = parsed;
      const key = makeKey(id, dlc, data);
      if (ignoreSetRef.current.has(key)) return;

      const now = Date.now();
      const map = rowsMapRef.current;
      const existing = map.get(key);
      rateCounterRef.current += 1;
      if (existing) {
        existing.type = type;
        existing.ms = ms;
        existing.lastSeen = now;
        if (!existing.holdExpect) existing.displayLastSeen = now; // freeze visual order if held
        existing.count += 1;
        if (existing.expect || existing.holdExpect) existing.matches += 1;
        if (expectCapturingRef.current) { existing.expect = true; existing.hidden = false; captureSetRef.current.add(key); }
        if (holdOnRef.current) { existing.hidden = !existing.expect; }
      } else {
        const newRow: RowItem = {
          key,
          id,
          dlc,
          data,
          type,
          ms,
          lastSeen: now,
          displayLastSeen: now,
          count: 1,
          expect: false,
          holdExpect: false,
          hidden: false,
          matches: 0,
        };
        if (expectCapturingRef.current) { newRow.expect = true; captureSetRef.current.add(key); }
        if (holdOnRef.current) newRow.hidden = !newRow.expect;
        map.set(key, newRow);
      }
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Periodic UI flush ~4Hz: also gives us color-age updates
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const arr: RowItem[] = [];
      rowsMapRef.current.forEach((row) => {
        if (!showHidden && row.hidden) return;
        arr.push(row);
      });
      arr.sort((a, b) => {
        const aTime = a.holdExpect ? a.displayLastSeen : a.lastSeen;
        const bTime = b.holdExpect ? b.displayLastSeen : b.lastSeen;
        return changingFirst ? bTime - aTime : a.id.localeCompare(b.id) || a.data.localeCompare(b.data) || a.dlc - b.dlc;
      });
      setRows(arr);
      void now; // keep now referenced to avoid tree–shake
    }, 250);
    return () => clearInterval(interval);
  }, [showHidden, changingFirst]);

  // Message rate (per second)
  useEffect(() => {
    const t = setInterval(() => {
      setMsgRate(rateCounterRef.current);
      rateCounterRef.current = 0;
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const keyExtractor = useMemo(() => (item: RowItem) => item.key, []);

  const onPressExpect = (row: RowItem) => {
    const r = rowsMapRef.current.get(row.key);
    if (!r) return;
    r.expect = !r.expect;
  };
  const onPressHoldExpect = (row: RowItem) => {
    const r = rowsMapRef.current.get(row.key);
    if (!r) return;
    if (r.holdExpect) {
      r.holdExpect = false;
      r.displayLastSeen = r.lastSeen; // unfreeze to current
    } else {
      r.holdExpect = true;
      r.expect = true;
      // freeze display order at current value
      r.displayLastSeen = r.displayLastSeen || r.lastSeen;
    }
  };
  const onPressIgnore = (row: RowItem) => {
    ignoreSetRef.current.add(row.key);
    rowsMapRef.current.delete(row.key);
    // immediate visual update
    setRows((prev) => prev.filter((r) => r.key !== row.key));
  };
  const onPressHide = (row: RowItem) => {
    const r = rowsMapRef.current.get(row.key);
    if (!r) return;
    r.hidden = !r.hidden;
  };

  const renderItem = ({ item }: { item: RowItem }) => {
    const age = Date.now() - item.lastSeen;
    const colorStyle = getAgeColorStyle(age);
    return (
      <View style={[styles.card, colorStyle]}>
        <View style={styles.cardTop}>
          <View style={styles.badgesLeft}>
            <Text style={styles.badgeMs}>{Number.isFinite(item.ms) ? item.ms : 0}</Text>
            <Text style={styles.badgeType}>{item.type}</Text>
            <Text style={styles.badgeId}>{item.id}</Text>
            <Text style={styles.badgeDlc}>DLC {item.dlc}</Text>
          </View>
          <View style={styles.badgesRight}>
            {(item.expect || item.holdExpect) && (
              <Text style={[styles.pill, item.holdExpect ? styles.pillHold : styles.pillExpect]}>
                {item.holdExpect ? 'HOLD' : 'EXPECT'}
              </Text>
            )}
            {item.matches > 0 && <Text style={[styles.pill, styles.pillMatch]}>+{item.matches}</Text>}
            <Text style={styles.count}>#{item.count}</Text>
          </View>
        </View>
        <Text style={styles.dataLine}>{item.data || '--'}</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={() => onPressExpect(item)} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>{item.expect ? 'Unexpect' : 'Expect'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPressHoldExpect(item)} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>{item.holdExpect ? 'Unhold' : 'Hold+Expect'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPressHide(item)} style={styles.smallBtn}>
            <Text style={styles.smallBtnText}>{item.hidden ? 'Unhide' : 'Hide'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onPressIgnore(item)} style={[styles.smallBtn, styles.smallBtnDanger]}>
            <Text style={[styles.smallBtnText, styles.smallBtnDangerText]}>Ignore</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sniff CAN Messages</Text>
      <View style={styles.serverInfo}>
        <Text style={styles.serverLabel}>Connected Server:</Text>
        <Text style={styles.serverUrl}>{selectedServerUrl || 'No server selected'}</Text>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.modeToggle}>
          <TouchableOpacity
            onPressIn={() => setNormalHeld(true)}
            onPressOut={() => setNormalHeld(false)}
            style={[styles.modeBtn, normalHeld && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, normalHeld && styles.modeBtnTextActive]}>Normal (Hold)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPressIn={() => {
              // start fresh capture set
              captureSetRef.current.clear();
              setExpectCapturing(true);
            }}
            onPressOut={() => {
              setExpectCapturing(false);
              // finalize whitelist: anything not captured becomes hidden (unless already expect from prior captures?)
              const captured = captureSetRef.current;
              rowsMapRef.current.forEach((r) => {
                if (!captured.has(r.key)) {
                  r.expect = false; // not part of current whitelist
                  if (holdOnRef.current) r.hidden = true; // in hold, hide non-whitelisted
                } else {
                  r.expect = true;
                  r.hidden = false;
                }
              });
              // Clear set for next capture session
              captureSetRef.current.clear();
              if (!showHidden) setRows((prev) => prev.filter((x) => !rowsMapRef.current.get(x.key)?.hidden));
            }}
            style={[styles.modeBtn, expectCapturing && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, expectCapturing && styles.modeBtnTextActive]}>Expect (Hold)</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setHoldOn((v) => {
                const next = !v;
                if (next) {
                  rowsMapRef.current.forEach((r) => { if (!r.expect) r.hidden = true; });
                  if (!showHidden) setRows([]);
                }
                return next;
              });
            }}
            style={[styles.modeBtn, holdOn && styles.modeBtnActive]}
          >
            <Text style={[styles.modeBtnText, holdOn && styles.modeBtnTextActive]}>Hold (Toggle)</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setChangingFirst((v) => !v)} style={styles.toolbarBtn}>
          <Text style={styles.toolbarBtnText}>{changingFirst ? 'Changing First' : 'Stable Order'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowHidden((v) => !v)} style={styles.toolbarBtn}>
          <Text style={styles.toolbarBtnText}>{showHidden ? 'Hide Hidden' : 'Show Hidden'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            rowsMapRef.current.forEach((r) => { r.hidden = true; });
            setRows((prev) => (showHidden ? prev : []));
          }}
          style={styles.toolbarBtn}
        >
          <Text style={styles.toolbarBtnText}>Hide All</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => { rowsMapRef.current.clear(); setRows([]); }} style={styles.toolbarBtn}>
          <Text style={styles.toolbarBtnText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rows}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={30}
        maxToRenderPerBatch={50}
        windowSize={9}
        removeClippedSubviews
        ListHeaderComponent={
          <View style={styles.headerSummary}>
            <Text style={styles.headerSummaryText}>Rate: {msgRate} msg/s</Text>
            <Text style={styles.headerSummaryText}>
              {normalHeld ? 'Normal: showing all while held' : holdOn ? 'Hold: blacklist active' : expectCapturing ? 'Expect: capturing whitelist (hold)' : 'Normal'}
            </Text>
            {!showHidden && rows.length === 0 && (
              <Text style={styles.headerMuted}>No visible frames. Switch to Expect or Show Hidden.</Text>
            )}
          </View>
        }
        contentContainerStyle={rows.length === 0 ? { paddingBottom: 40 } : { paddingBottom: 80 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  serverInfo: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 },
  serverLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  serverUrl: { fontSize: 16, fontWeight: '600', color: '#333' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  toolbarBtn: { backgroundColor: '#eee', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8, marginBottom: 8 },
  toolbarBtnText: { color: '#333', fontWeight: '600' },
  headerSummary: { paddingVertical: 8 },
  headerSummaryText: { color: '#666', fontSize: 12 },
  headerMuted: { color: '#999', fontSize: 12, marginTop: 4 },
  modeToggle: { flexDirection: 'row', backgroundColor: '#eaeaea', borderRadius: 10, overflow: 'hidden' },
  modeBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  modeBtnActive: { backgroundColor: '#007AFF' },
  modeBtnText: { color: '#333', fontWeight: '700' },
  modeBtnTextActive: { color: '#fff' },
  card: { borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#e5e5e5', padding: 10, marginBottom: 10, backgroundColor: '#fff' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  badgesLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgesRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badgeMs: { fontFamily: 'monospace', fontSize: 12, color: '#666' },
  badgeType: { fontFamily: 'monospace', fontSize: 12, color: '#666', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f2f2f2' },
  badgeId: { fontFamily: 'monospace', fontSize: 13, color: '#111', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: '#f2f2f2' },
  badgeDlc: { fontFamily: 'monospace', fontSize: 12, color: '#666' },
  pill: { fontSize: 10, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100 },
  pillExpect: { backgroundColor: '#E6F0FF', color: '#007AFF' },
  pillHold: { backgroundColor: '#FFF4E5', color: '#C77700' },
  pillMatch: { backgroundColor: '#EAF8ED', color: '#34C759' },
  count: { fontSize: 11, color: '#666' },
  dataLine: { fontFamily: 'monospace', fontSize: 13, color: '#111', letterSpacing: 1, marginBottom: 6 },
  actionsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  smallBtn: { backgroundColor: '#f0f0f0', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  smallBtnDanger: { backgroundColor: '#ff3b30' },
  smallBtnText: { fontSize: 12, color: '#333', fontWeight: '600' },
  smallBtnDangerText: { color: '#fff' },
});

export default Sniff;

// -------- Helpers --------
function parseCsvLine(line: string): { id: string; dlc: number; data: string; type: string; ms: number } | null {
  // Expect ms,type,id_hex,dlc,HEX_BYTES
  // type can include ":RTR". We accept INFO/ERR but ignore those frames.
  const parts = line.split(',');
  if (parts.length < 4) return null;
  const msStr = String(parts[0] || '').trim();
  const type = String(parts[1] || '').trim();
  if (!type || type.startsWith('INFO') || type.startsWith('ERR')) return null;
  const idHex = String(parts[2] || '').trim().toUpperCase();
  const dlcStr = String(parts[3] || '').trim();
  const dataHex = (parts[4] || '').trim();
  const dlc = Number(dlcStr);
  if (!idHex || !Number.isFinite(dlc)) return null;
  const ms = Number(msStr);
  const data = dataHex || '';
  return { id: idHex, dlc, data, type, ms: Number.isFinite(ms) ? ms : 0 };
}

function makeKey(id: string, dlc: number, data: string): RowKey {
  return `${id}|${dlc}|${data}`;
}

function getAgeColorStyle(ageMs: number) {
  if (ageMs <= GREEN_MS) return stylesRowColor.green;
  if (ageMs <= YELLOW_MS) return stylesRowColor.yellow;
  if (ageMs <= RED_MS) return stylesRowColor.red;
  return stylesRowColor.stale;
}

const stylesRowColor = StyleSheet.create({
  green: { backgroundColor: '#F0FFF4' },
  yellow: { backgroundColor: '#FFFBEB' },
  red: { backgroundColor: '#FEF2F2' },
  stale: { backgroundColor: '#FAFAFA' },
});
