import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';

const LogAll: React.FC = () => {
  const { getSelectedServerUrl } = useSettings();
  const selectedServerUrl = getSelectedServerUrl();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log All Messages</Text>
      <View style={styles.serverInfo}>
        <Text style={styles.serverLabel}>Connected Server:</Text>
        <Text style={styles.serverUrl}>{selectedServerUrl || 'No server selected'}</Text>
      </View>
      <Text style={styles.placeholder}>Message logging functionality will be implemented here.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 20 },
  serverInfo: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 8, marginBottom: 20 },
  serverLabel: { fontSize: 14, color: '#666', marginBottom: 5 },
  serverUrl: { fontSize: 16, fontWeight: '600', color: '#333' },
  placeholder: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 40 },
});

export default LogAll;
