import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface HeaderGearProps {
  onPress: () => void;
}

const HeaderGear: React.FC<HeaderGearProps> = ({ onPress }) => {
  return (
    <TouchableOpacity 
      onPress={onPress}
      style={{ paddingHorizontal: 16, paddingVertical: 8 }}
    >
      <Text style={{ fontSize: 18, color: '#007AFF' }}>⚙️</Text>
    </TouchableOpacity>
  );
};

export default HeaderGear;
