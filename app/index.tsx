import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSettings } from "../context/SettingsContext";

const LaunchGate: React.FC = () => {
  const router = useRouter();
  const { state } = useSettings();

  useEffect(() => {
    if (!state.ready) return;

    if (state.servers.length === 0) {
      router.replace("/settings/servers");
    } else if (state.selectedServerId === null) {
      router.replace("/server-select");
    } else {
      router.replace("/main-menu");
    }
  }, [state.ready, state.servers.length, state.selectedServerId, router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
};

export default LaunchGate;
