import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useLayoutEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import HeaderGear from "../components/HeaderGear";
import { useSettings } from "../context/SettingsContext";

const MainMenu: React.FC = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const { getSelectedServerUrl } = useSettings();

  const selectedServerUrl = getSelectedServerUrl();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderGear onPress={() => router.push("/settings")} />
      ),
      title: "CAN Sniffer",
    });
  }, [navigation, router]);

  const menuItems = [
    { title: "Sniff", path: "/sniff" },
    { title: "Log All", path: "/log-all" },
    { title: "Send Custom", path: "/send-custom" },
    { title: "Saved Messages", path: "/saved-messages" },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.serverInfo}>
        <Text style={styles.serverLabel}>Connected Server:</Text>
        <Text style={styles.serverUrl}>
          {selectedServerUrl || "No server selected"}
        </Text>
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.path}
            style={styles.menuButton}
            onPress={() => router.push(item.path as any)}
          >
            <Text style={styles.menuButtonText}>{item.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  serverInfo: {
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  serverLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  serverUrl: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  menuContainer: {
    flex: 1,
  },
  menuButton: {
    backgroundColor: "#007AFF",
    padding: 20,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  menuButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});

export default MainMenu;
