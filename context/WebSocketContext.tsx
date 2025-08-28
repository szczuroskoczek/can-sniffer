import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from './SettingsContext';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WebSocketContextValue {
  status: ConnectionStatus;
  lastError: string | null;
  isConnected: boolean;
  connect: (urlOverride?: string) => void;
  disconnect: () => void;
  toggle: () => void;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const WebSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getSelectedServerUrl } = useSettings();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  const cleanupSocket = useCallback(() => {
    if (socketRef.current) {
      try {
        socketRef.current.onopen = null as any;
        socketRef.current.onmessage = null as any;
        socketRef.current.onclose = null as any;
        socketRef.current.onerror = null as any;
        socketRef.current.close();
      } catch {}
    }
    socketRef.current = null;
    currentUrlRef.current = null;
  }, []);

  const connect = useCallback((urlOverride?: string) => {
    const url = urlOverride ?? getSelectedServerUrl();
    console.log('connect', url);
    setLastError(null);
    if (!url) {
      setLastError('No server selected');
      setStatus('error');
      return;
    }
    if (status === 'connecting' || (status === 'connected' && url === currentUrlRef.current)) {
      return;
    }
    // Tear down any existing socket before creating a new one
    cleanupSocket();
    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      socketRef.current = ws;
      currentUrlRef.current = url;

      ws.onopen = () => {
        setStatus('connected');
      };
      ws.onerror = (event: any) => {
        setLastError(typeof event?.message === 'string' ? event.message : 'Connection error');
        setStatus('error');
      };
      ws.onclose = () => {
        setStatus('disconnected');
        socketRef.current = null;
        currentUrlRef.current = null;
      };
    } catch (e: any) {
      setLastError(e?.message ?? 'Failed to create WebSocket');
      setStatus('error');
      cleanupSocket();
    }
  }, [cleanupSocket, getSelectedServerUrl, status]);

  const disconnect = useCallback(() => {
    // If currently connecting, close the socket to abort the handshake
    try {
      if (socketRef.current && (status === 'connecting' || status === 'connected')) {
        socketRef.current.close();
      }
    } catch {}
    cleanupSocket();
    setStatus('disconnected');
  }, [cleanupSocket, status]);

  // If the selected server changes while connected, do not auto-connect/disconnect.
  // We simply keep the existing connection; user can toggle.
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      cleanupSocket();
    };
  }, [cleanupSocket]);

  const toggle = useCallback(() => {
    if (status === 'connected' || status === 'connecting') {
      disconnect();
    } else {
      connect();
    }
  }, [connect, disconnect, status]);

  const value: WebSocketContextValue = useMemo(() => ({
    status,
    lastError,
    isConnected: status === 'connected',
    connect,
    disconnect,
    toggle,
  }), [connect, disconnect, lastError, status, toggle]);

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = (): WebSocketContextValue => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return ctx;
};


