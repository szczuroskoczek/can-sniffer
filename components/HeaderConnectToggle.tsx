import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useWebSocket } from '../context/WebSocketContext';

interface HeaderConnectToggleProps {
  disabled?: boolean;
}

const HeaderConnectToggle: React.FC<HeaderConnectToggleProps> = ({ disabled }) => {
  const { status, toggle } = useWebSocket();

  const label = status === 'connected' ? 'Disconnect' : status === 'connecting' ? 'Connecting…' : 'Connect';
  const isBusy = status === 'connecting';

  return (
    <TouchableOpacity
      onPress={toggle}
      disabled={disabled}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <View style={styles.dot(status)} />
      <Text style={styles.text}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  dot: (status: string) => ({
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
    backgroundColor:
      status === 'connected' ? '#34C759' : status === 'connecting' ? '#FFCC00' : '#FF3B30',
  }),
});

export default HeaderConnectToggle;
