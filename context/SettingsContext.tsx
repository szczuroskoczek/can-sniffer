import React, { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';
import { defaultState, loadSettings, saveSettings, Server, SettingsState } from '../utils/storage';

export type SettingsAction =
  | { type: 'ADD_SERVER'; url: string }
  | { type: 'EDIT_SERVER'; id: string; url: string }
  | { type: 'REMOVE_SERVER'; id: string }
  | { type: 'SET_SELECTED'; id: string | null }
  | { type: 'HYDRATE'; state: SettingsState };

interface SettingsContextType {
  state: SettingsState;
  dispatch: React.Dispatch<SettingsAction>;
  getSelectedServerUrl: () => string | null;
  addServer: (url: string) => void;
  editServer: (id: string, url: string) => void;
  removeServer: (id: string) => void;
  setSelectedServer: (id: string | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const settingsReducer = (state: SettingsState, action: SettingsAction): SettingsState => {
  switch (action.type) {
    case 'ADD_SERVER': {
      const newServer: Server = {
        id: Date.now().toString(),
        url: action.url,
      };
      return {
        ...state,
        servers: [...state.servers, newServer],
      };
    }
    case 'EDIT_SERVER': {
      return {
        ...state,
        servers: state.servers.map(server =>
          server.id === action.id ? { ...server, url: action.url } : server
        ),
      };
    }
    case 'REMOVE_SERVER': {
      const newServers = state.servers.filter(server => server.id !== action.id);
      const newSelectedId = state.selectedServerId === action.id ? null : state.selectedServerId;
      return {
        ...state,
        servers: newServers,
        selectedServerId: newSelectedId,
      };
    }
    case 'SET_SELECTED': {
      return {
        ...state,
        selectedServerId: action.id,
      };
    }
    case 'HYDRATE': {
      return action.state;
    }
    default:
      return state;
  }
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(settingsReducer, defaultState);

  useEffect(() => {
    // Load settings on app start
    loadSettings().then(loadedState => {
      dispatch({ type: 'HYDRATE', state: loadedState });
    });
  }, []);

  useEffect(() => {
    // Save settings after every mutation (except hydration)
    if (state.ready) {
      saveSettings(state);
    }
  }, [state]);

  const getSelectedServerUrl = (): string | null => {
    if (!state.selectedServerId) return null;
    const server = state.servers.find(s => s.id === state.selectedServerId);
    return server?.url || null;
  };

  const addServer = (url: string) => {
    dispatch({ type: 'ADD_SERVER', url });
  };

  const editServer = (id: string, url: string) => {
    dispatch({ type: 'EDIT_SERVER', id, url });
  };

  const removeServer = (id: string) => {
    dispatch({ type: 'REMOVE_SERVER', id });
  };

  const setSelectedServer = (id: string | null) => {
    dispatch({ type: 'SET_SELECTED', id });
  };

  const contextValue: SettingsContextType = {
    state,
    dispatch,
    getSelectedServerUrl,
    addServer,
    editServer,
    removeServer,
    setSelectedServer,
  };

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
