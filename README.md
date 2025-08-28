# CAN Sniffer Client

A React Native Expo app for connecting to and monitoring CAN bus networks via WebSocket servers.

## Features

- Server management (add, edit, delete, select servers)
- Navigation between different CAN operations
- Persistent server configuration using AsyncStorage
- TypeScript support with strict typing
- Expo Router (file-based routing on top of React Navigation)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Expo-specific dependencies:
```bash
npx expo install react-native-screens react-native-safe-area-context @react-native-async-storage/async-storage expo-router
```

Expo Router is already configured in `app.json` (plugin) and `package.json` (main entry).

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

### Navigation Flow (Expo Router)

File-based routes are under `app/` and screens live in `screens/`.

1. `app/index.tsx` → **LaunchGate** decides initial route:
   - No servers → navigate to `/settings/servers`
   - Servers exist but none selected → navigate to `/server-select`
   - Server selected → navigate to `/main-menu`

2. **MainMenu** (`/main-menu`): Main dashboard with 4 operation buttons
   - Sniff CAN Messages
   - Log All Messages
   - Send Custom Message
   - Saved Messages
   - Settings gear icon in header

3. **ServerSelect** (`/server-select`): Choose from available servers when none is selected

4. **Settings** (`/settings`) and **Servers** (`/settings/servers`): Manage servers (CRUD + select)

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
- **Expo Router** (file-based routing powered by React Navigation)
- **TypeScript** for type safety
- **React Context + useReducer** for state management
- **AsyncStorage** for persistence
- **React Native core components** (no external UI library)

### File Structure

```
app/
├── _layout.tsx              # Router layout, wraps app with SettingsProvider
├── +not-found.tsx           # Not found route
├── index.tsx                # LaunchGate (initial routing)
├── main-menu.tsx            # Main menu route
├── server-select.tsx        # Select server route
├── sniff.tsx                # Placeholder route
├── log-all.tsx              # Placeholder route
├── send-custom.tsx          # Placeholder route
├── saved-messages.tsx       # Placeholder route
└── settings/
    └── servers.tsx         # Servers management route

screens/
├── LaunchGate.tsx
├── MainMenu.tsx
├── ServerSelect.tsx
├── Settings.tsx
├── Servers.tsx
├── Sniff.tsx
├── LogAll.tsx
├── SendCustom.tsx
└── SavedMessages.tsx

context/
└── SettingsContext.tsx

components/
└── HeaderGear.tsx

utils/
└── storage.ts
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