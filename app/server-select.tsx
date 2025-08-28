import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';
import { Server } from '../utils/storage';

const ServerSelect: React.FC = () => {
  const router = useRouter();
  const { state, setSelectedServer } = useSettings();
  const [selectedId, setSelectedId] = useState<string | null>(state.selectedServerId);

  const handleContinue = () => {
    if (selectedId) {
      setSelectedServer(selectedId);
      router.replace('/main-menu');
    }
  };

  const handleManageServers = () => {
    router.push('/settings/servers');
  };

  const renderServer = ({ item }: { item: Server }) => (
    <TouchableOpacity style={styles.serverItem} onPress={() => setSelectedId(item.id)}>
      <View style={styles.radioContainer}>
        <View style={[styles.radio, selectedId === item.id && styles.radioSelected]} />
      </View>
      <Text style={styles.serverUrl}>{item.url}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a server to connect to:</Text>

      <FlatList data={state.servers} renderItem={renderServer} keyExtractor={(item) => item.id} style={styles.serverList} />

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.continueButton, !selectedId && styles.buttonDisabled]} onPress={handleContinue} disabled={!selectedId}>
          <Text style={[styles.buttonText, styles.continueButtonText]}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.manageButton]} onPress={handleManageServers}>
          <Text style={[styles.buttonText, styles.manageButtonText]}>Manage Servers</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 20, color: '#333' },
  serverList: { flex: 1 },
  serverItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  radioContainer: { marginRight: 15 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd' },
  radioSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  serverUrl: { fontSize: 16, color: '#333', flex: 1 },
  buttonContainer: { marginTop: 20 },
  button: { padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  continueButton: { backgroundColor: '#007AFF' },
  manageButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#007AFF' },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { fontSize: 16, fontWeight: '600' },
  continueButtonText: { color: '#fff' },
  manageButtonText: { color: '#007AFF' },
});

export default ServerSelect;
