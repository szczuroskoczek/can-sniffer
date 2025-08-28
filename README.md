# CAN Sniffer Client

A React Native Expo app for connecting to and monitoring CAN bus networks via WebSocket servers.

## Features

- Server management (add, edit, delete, select servers)
- Navigation between different CAN operations
- Persistent server configuration using AsyncStorage
- TypeScript support with strict typing
- React Navigation for seamless screen transitions

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Expo-specific dependencies:
```bash
npx expo install react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage
```

3. Install React Navigation packages:
```bash
npm install @react-navigation/native @react-navigation/native-stack
```

## Running the App

```bash
# Start the development server
npm run start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Run on web
npm run web
```

## App Structure

### Navigation Flow

1. **LaunchGate**: Determines initial route based on saved servers
   - No servers → Navigate to Servers screen
   - Servers exist but none selected → Navigate to ServerSelect
   - Server selected → Navigate to MainMenu

2. **MainMenu**: Main dashboard with 4 operation buttons
   - Sniff CAN Messages
   - Log All Messages
   - Send Custom Message
   - Saved Messages
   - Settings gear icon in header

3. **ServerSelect**: Choose from available servers when none is selected

4. **Settings Stack**: 
   - Settings: Main settings screen
   - Servers: Full CRUD operations for server management

### Key Components

- **SettingsContext**: React Context with useReducer for state management
- **AsyncStorage**: Persistent storage for server list and selection
- **HeaderGear**: Settings icon component for navigation
- **Server Management**: Add, edit, delete, and select servers

### Server Configuration

Servers are stored with the following structure:
```typescript
type Server = {
  id: string;
  url: string; // e.g., "ws://192.168.4.1:81/"
};
```

## Development

The app uses:
- **React Navigation 7** for navigation
- **TypeScript** for type safety
- **React Context + useReducer** for state management
- **AsyncStorage** for persistence
- **React Native core components** (no external UI library)

### File Structure

```
src/
├── navigation/
│   ├── AppNavigator.tsx    # Main navigation setup
│   └── types.ts           # Navigation type definitions
├── screens/
│   ├── LaunchGate.tsx     # Initial routing logic
│   ├── MainMenu.tsx       # Main dashboard
│   ├── ServerSelect.tsx   # Server selection
│   ├── Settings.tsx       # Settings menu
│   ├── Servers.tsx        # Server management
│   └── [Placeholder screens for CAN operations]
├── context/
│   └── SettingsContext.tsx # State management
├── components/
│   └── HeaderGear.tsx     # Settings icon
└── utils/
    └── storage.ts         # AsyncStorage utilities
```

## Next Steps

This is the foundation for the CAN sniffer client. Future implementations will include:

1. WebSocket connection management
2. Real-time CAN message display
3. Message filtering and search
4. Custom message composition and sending
5. Message logging and export
6. Saved message templates

## Usage

1. **First Launch**: If no servers are configured, you'll be taken directly to the server management screen
2. **Add Server**: Enter a WebSocket URL (e.g., `ws://192.168.4.1:81/`)
3. **Select Server**: Choose which server to connect to
4. **Main Menu**: Access all CAN operations from the main dashboard
5. **Settings**: Manage servers via the gear icon in the header