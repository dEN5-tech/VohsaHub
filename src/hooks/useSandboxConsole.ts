import { useState, useEffect, useCallback } from 'preact/hooks';
import type { ConsoleEntry } from '../components/ConsoleDrawer';

export interface UseSandboxConsoleReturn {
  consoleEntries: ConsoleEntry[];
  isConsoleOpen: boolean;
  setIsConsoleOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  clearConsole: () => void;
}

export function useSandboxConsole(): UseSandboxConsoleReturn {
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState<boolean>(false);

  const clearConsole = useCallback(() => {
    setConsoleEntries([]);
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'VOHSA_CONSOLE') {
        const newEntry: ConsoleEntry = {
          id: Math.random().toString(36).substring(2, 9),
          level: event.data.level,
          messages: event.data.messages || [],
          timestamp: event.data.timestamp || new Date().toLocaleTimeString(),
        };
        setConsoleEntries((prev) => [...prev.slice(-99), newEntry]);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return {
    consoleEntries,
    isConsoleOpen,
    setIsConsoleOpen,
    clearConsole,
  };
}
