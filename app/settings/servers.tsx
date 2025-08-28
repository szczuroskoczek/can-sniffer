import React, { useState } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../../context/SettingsContext';
import { Server } from '../../utils/storage';

const quickAddServers = [
  { label: 'CANSNIFFER official dev server', url: 'ws://localhost:3303/' },
];

const Servers: React.FC = () => {
  const { state, addServer, editServer, removeServer, setSelectedServer } = useSettings();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [serverUrl, setServerUrl] = useState('');

  const handleAddServer = () => {
    setEditingServer(null);
    setServerUrl('');
    setIsModalVisible(true);
  };

  const handleEditServer = (server: Server) => {
    setEditingServer(server);
    setServerUrl(server.url);
    setIsModalVisible(true);
  };

  const handleSaveServer = () => {
    if (!serverUrl.trim()) {
      Alert.alert('Error', 'Please enter a server URL');
      return;
    }

    if (editingServer) {
      editServer(editingServer.id, serverUrl.trim());
    } else {
      addServer(serverUrl.trim());
    }

    setIsModalVisible(false);
    setServerUrl('');
    setEditingServer(null);
  };

  const handleDeleteServer = (server: Server) => {
    Alert.alert('Delete Server', `Are you sure you want to delete ${server.url}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeServer(server.id) },
    ]);
  };

  const handleSelectServer = (serverId: string) => {
    setSelectedServer(serverId);
  };

  const renderServer = ({ item }: { item: Server }) => {
    const isSelected = item.id === state.selectedServerId;
    return (
      <View style={styles.serverItem}>
        <TouchableOpacity style={styles.radioContainer} onPress={() => handleSelectServer(item.id)}>
          <View style={[styles.radio, isSelected && styles.radioSelected]} />
        </TouchableOpacity>
        <View style={styles.serverContent}>
          <Text style={styles.serverUrl}>{item.url}</Text>
          {isSelected && <Text style={styles.selectedLabel}>Selected</Text>}
        </View>
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEditServer(item)}>
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDeleteServer(item)}>
            <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.addButton} onPress={handleAddServer}>
        <Text style={styles.addButtonText}>+ Add Server</Text>
      </TouchableOpacity>

      {state.servers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No servers configured</Text>
          <Text style={styles.emptySubtext}>Add a server to get started</Text>
        </View>
      ) : (
        <FlatList data={state.servers} renderItem={renderServer} keyExtractor={(item) => item.id} style={styles.serverList} />
      )}

      <Modal visible={isModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{editingServer ? 'Edit Server' : 'Add Server'}</Text>
            <TouchableOpacity onPress={handleSaveServer}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.inputLabel}>Server URL:</Text>
            <TextInput style={styles.input} value={serverUrl} onChangeText={setServerUrl} placeholder="ws://192.168.4.1:81/" autoCapitalize="none" autoCorrect={false} />
            <Text style={styles.inputHint}>Enter the WebSocket URL for your CAN server</Text>

            <View style={styles.quickAddSection}>
              <Text style={styles.quickAddTitle}>Quick Add:</Text>
              <FlatList
                data={quickAddServers}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.quickAddButton} onPress={() => setServerUrl(item.url)}>
                    <View style={styles.quickAddContent}>
                      <Text style={styles.quickAddLabel}>{item.label}</Text>
                      <Text style={styles.quickAddUrl}>{item.url}</Text>
                    </View>
                    <Text style={styles.quickAddChevron}>›</Text>
                  </TouchableOpacity>
                )}
                keyExtractor={(item) => item.url}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  addButton: { backgroundColor: '#007AFF', margin: 20, padding: 15, borderRadius: 8, alignItems: 'center' },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  serverList: { flex: 1, paddingHorizontal: 20 },
  serverItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 10 },
  radioContainer: { marginRight: 15 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#ddd' },
  radioSelected: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  serverContent: { flex: 1 },
  serverUrl: { fontSize: 16, color: '#333' },
  selectedLabel: { fontSize: 12, color: '#007AFF', fontWeight: '600', marginTop: 2 },
  actionsContainer: { flexDirection: 'row' },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, marginLeft: 8, backgroundColor: '#f0f0f0' },
  deleteButton: { backgroundColor: '#ff3b30' },
  actionButtonText: { fontSize: 14, color: '#333' },
  deleteButtonText: { color: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#333', textAlign: 'center', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#666', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  cancelButton: { fontSize: 16, color: '#007AFF' },
  saveButton: { fontSize: 16, color: '#007AFF', fontWeight: '600' },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 15, fontSize: 16, backgroundColor: '#fff' },
  inputHint: { fontSize: 14, color: '#666', marginTop: 8 },
  quickAddSection: { marginTop: 24 },
  quickAddTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  quickAddButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#e9ecef', borderRadius: 12, padding: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  quickAddContent: { flex: 1 },
  quickAddLabel: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 4 },
  quickAddUrl: { fontSize: 14, color: '#666', fontFamily: 'monospace' },
  quickAddChevron: { fontSize: 18, color: '#007AFF', fontWeight: '600' },
});

export default Servers;
