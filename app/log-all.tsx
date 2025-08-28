import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { useWebSocket } from '../context/WebSocketContext';

const LogAll: React.FC = () => {
  const { getSelectedServerUrl } = useSettings();
  const { addMessageListener } = useWebSocket();
  const selectedServerUrl = getSelectedServerUrl();

  // Efficient append buffer: accumulate lines in a ref, periodically flush to state
  const [lines, setLines] = useState<string[]>([]);
  const bufferRef = useRef<string[]>([]);
  const flushingRef = useRef(false);
  const autoScrollRef = useRef(true);
  const flatListRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    const unsubscribe = addMessageListener((line) => {
      // Push into a mutable buffer to avoid causing re-renders per message
      bufferRef.current.push(line);
      // Schedule a micro-batched flush using rAF or setTimeout
      if (!flushingRef.current) {
        flushingRef.current = true;
        requestAnimationFrame(() => {
          if (bufferRef.current.length > 0) {
            // Append to state once per frame
            setLines((prev) => prev.concat(bufferRef.current));
            bufferRef.current = [];
          }
          flushingRef.current = false;
        });
      }
    });
    return unsubscribe;
  }, [addMessageListener]);

  // Key extractor for FlatList
  const keyExtractor = useMemo(() => (item: string, index: number) => `${index}-${item.length}` , []);

  const onContentSizeChange = useCallback(() => {
    if (autoScrollRef.current) {
      requestAnimationFrame(() => {
        (flatListRef.current as any)?.scrollToEnd?.({ animated: false });
      });
    }
  }, []);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    const atBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 40;
    autoScrollRef.current = atBottom;
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log All Messages</Text>
      <View style={styles.serverInfo}>
        <Text style={styles.serverLabel}>Connected Server:</Text>
        <Text style={styles.serverUrl}>{selectedServerUrl || 'No server selected'}</Text>
      </View>
      <View style={styles.listContainer}>
        <FlatList
          ref={flatListRef}
          data={lines}
          keyExtractor={keyExtractor}
          renderItem={({ item }) => <Text style={styles.line}>{item}</Text>}
          initialNumToRender={30}
          maxToRenderPerBatch={50}
          windowSize={9}
          removeClippedSubviews
          onContentSizeChange={onContentSizeChange}
          onScroll={onScroll}
          scrollEventThrottle={100}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  serverInfo: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 },
  serverLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  serverUrl: { fontSize: 16, fontWeight: '600', color: '#333' },
  listContainer: { flex: 1, marginTop: 10 },
  line: { fontFamily: 'monospace', fontSize: 12, color: '#111', paddingVertical: 2 },
});

export default LogAll;
