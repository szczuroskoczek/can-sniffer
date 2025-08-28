import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSettings } from '../context/SettingsContext';

const Settings: React.FC = () => {
  const router = useRouter();
  const { state } = useSettings();

  useEffect(() => {
    if (state.ready && state.servers.length === 0) {
      router.replace('/settings/servers');
    }
  }, [state.ready, state.servers.length, router]);

  const settingsItems = [
    { title: 'Servers', subtitle: 'Manage server connections', onPress: () => router.push('/settings/servers') },
  ];

  return (
    <View style={styles.container}>
      {settingsItems.map((item, index) => (
        <TouchableOpacity key={index} style={styles.settingsItem} onPress={item.onPress}>
          <View style={styles.textContainer}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.subtitle}>{item.subtitle}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  textContainer: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 2 },
  subtitle: { fontSize: 14, color: '#666' },
  chevron: { fontSize: 20, color: '#ccc' },
});

export default Settings;
