/**
 * Terminal Component
 *
 * xterm.js-based terminal component with WebSocket communication,
 * connection status handling, and auto-reconnect.
 *
 * Requires xterm.js dependencies:
 * - @xterm/xterm
 * - @xterm/addon-fit
 */

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, WifiOff, RotateCw } from 'lucide-react';

// Lazy load xterm.js to avoid issues when not available
let XTerm: any = null;
let FitAddon: any = null;
let xtermCssLoaded = false;

// Try to load xterm.js dynamically
async function loadXTerm() {
  if (XTerm) return { XTerm, FitAddon };

  try {
    const xtermModule = await import('@xterm/xterm');
    const fitModule = await import('@xterm/addon-fit');

    XTerm = xtermModule.Terminal;
    FitAddon = fitModule.FitAddon;

    // Load CSS
    if (!xtermCssLoaded && typeof document !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/node_modules/@xterm/xterm/css/xterm.css';
      document.head.appendChild(link);
      xtermCssLoaded = true;
    }

    return { XTerm, FitAddon };
  } catch (error) {
    console.error('Failed to load xterm.js:', error);
    return null;
  }
}

interface TerminalProps {
  sessionId: string;
  cwd?: string;
  onTitleChange?: (title: string) => void;
  onExit?: (exitCode: number) => void;
  className?: string;
}

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error' | 'unavailable';

// Tokyo Night theme for terminal
const TERMINAL_THEME = {
  background: '#1a1b26',
  foreground: '#a9b1d6',
  cursor: '#c0caf5',
  cursorAccent: '#1a1b26',
  selectionBackground: '#33467c',
  black: '#15161e',
  red: '#f7768e',
  green: '#9ece6a',
  yellow: '#e0af68',
  blue: '#7aa2f7',
  magenta: '#bb9af7',
  cyan: '#7dcfff',
  white: '#a9b1d6',
  brightBlack: '#414868',
  brightRed: '#f7768e',
  brightGreen: '#9ece6a',
  brightYellow: '#e0af68',
  brightBlue: '#7aa2f7',
  brightMagenta: '#bb9af7',
  brightCyan: '#7dcfff',
  brightWhite: '#c0caf5',
};

export function Terminal({
  sessionId,
  cwd,
  onTitleChange,
  onExit,
  className = ''
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any>(null);
  const fitAddonRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [xtermAvailable, setXtermAvailable] = useState<boolean | null>(null);

  // Load xterm.js on mount
  useEffect(() => {
    loadXTerm().then(result => {
      if (result) {
        setXtermAvailable(true);
      } else {
        setConnectionState('unavailable');
        setXtermAvailable(false);
      }
    });
  }, []);

  // Initialize terminal and WebSocket
  useEffect(() => {
    if (!terminalRef.current || xtermAvailable !== true) return;

    let xterm: any = null;
    let fitAddon: any = null;
    let ws: WebSocket | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const initializeTerminal = async () => {
      // Load xterm.js
      const xtermModule = await loadXTerm();
      if (!xtermModule) {
        setConnectionState('unavailable');
        return;
      }

      const { XTerm: XTermClass, FitAddon: FitAddonClass } = xtermModule;

      // Initialize xterm
      xterm = new XTermClass({
        theme: TERMINAL_THEME,
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", "SF Mono", monospace',
        fontSize: 14,
        lineHeight: 1.2,
        cursorBlink: true,
        cursorStyle: 'bar',
        scrollback: 5000,
        allowProposedApi: true,
      });

      fitAddon = new FitAddonClass();
      xterm.loadAddon(fitAddon);
      xterm.open(terminalRef.current!);
      fitAddon.fit();

      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;

      // Connect WebSocket
      connectWebSocket(xterm, fitAddon);
    };

    const connectWebSocket = (xtermInstance: any, fitAddonInstance: any) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/terminal?session=${sessionId}`;

      setConnectionState('connecting');

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnectionState('connected');
          setReconnectAttempts(0);

          // Request terminal creation
          ws?.send(JSON.stringify({
            type: 'terminal_create',
            cols: xtermInstance.cols,
            rows: xtermInstance.rows,
            cwd,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            switch (message.type) {
              case 'terminal_connected':
                // Initial connection acknowledgment
                break;

              case 'terminal_output':
                const data = atob(message.data);
                xtermInstance.write(data);

                // Extract title from ANSI sequences if present
                const titleMatch = data.match(/\x1b\]0;(.+?)\x07/);
                if (titleMatch && onTitleChange) {
                  onTitleChange(titleMatch[1]);
                }
                break;

              case 'terminal_ready':
                xtermInstance.write('\r\n\x1b[32m● Terminal connected\x1b[0m\r\n\r\n');
                break;

              case 'terminal_error':
                xtermInstance.write(`\r\n\x1b[31m✖ Error: ${message.error}\x1b[0m\r\n`);
                break;

              case 'terminal_exit':
                xtermInstance.write(`\r\n\x1b[33mProcess exited with code ${message.exitCode}\x1b[0m\r\n`);
                if (onExit) {
                  onExit(message.exitCode);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (_event) => {
          setConnectionState('disconnected');

          // Auto-reconnect with exponential backoff
          if (reconnectAttempts < 5) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              connectWebSocket(xtermInstance, fitAddonInstance);
            }, delay);
          }
        };

        ws.onerror = () => {
          setConnectionState('error');
        };

      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setConnectionState('error');
      }
    };

    // Handle user input
    const handleData = (data: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'terminal_input',
          data: btoa(data),
        }));
      }
    };

    // Handle resize
    const handleResize = () => {
      if (fitAddon) {
        fitAddon.fit();
        if (wsRef.current?.readyState === WebSocket.OPEN && xterm) {
          wsRef.current.send(JSON.stringify({
            type: 'terminal_resize',
            cols: xterm.cols,
            rows: xterm.rows,
          }));
        }
      }
    };

    initializeTerminal().then(() => {
      if (xterm) {
        xterm.onData(handleData);

        // Set up resize observer
        if (terminalRef.current) {
          resizeObserver = new ResizeObserver(handleResize);
          resizeObserver.observe(terminalRef.current);
        }
      }
    });

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (resizeObserver) {
        resizeObserver.disconnect();
      }

      if (ws) {
        ws.close();
      }

      if (xterm) {
        xterm.dispose();
      }
    };
  }, [sessionId, cwd, onTitleChange, onExit, xtermAvailable, reconnectAttempts]);

  const handleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    setReconnectAttempts(0);
    setConnectionState('connecting');
  };

  // Render connection status overlay
  const renderStatusOverlay = () => {
    if (connectionState === 'connected') return null;

    const statusConfigs: Record<string, { icon: React.ReactNode; title: string; color: string; showButton: boolean; buttonText?: string; buttonColor?: string }> = {
      connecting: {
        icon: <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto mb-2" />,
        title: 'Connecting...',
        color: 'text-gray-400',
        showButton: false,
      },
      disconnected: {
        icon: <WifiOff className="w-8 h-8 text-yellow-400 mx-auto mb-2" />,
        title: 'Disconnected',
        color: 'text-gray-400',
        showButton: true,
        buttonText: 'Reconnect',
        buttonColor: 'bg-blue-600 hover:bg-blue-700',
      },
      error: {
        icon: <div className="w-8 h-8 text-red-400 mx-auto mb-2">✖</div>,
        title: 'Connection failed',
        color: 'text-red-400',
        showButton: true,
        buttonText: 'Try Again',
        buttonColor: 'bg-red-600 hover:bg-red-700',
      },
      unavailable: {
        icon: <div className="w-8 h-8 text-gray-500 mx-auto mb-2">⚠</div>,
        title: 'Terminal unavailable',
        color: 'text-gray-500',
        showButton: false,
      },
    };

    const config = statusConfigs[connectionState];

    return (
      <div className="absolute inset-0 bg-black/90 flex items-center justify-center">
        <div className="text-center">
          {config.icon}
          <p className={`${config.color} mb-3`}>{config.title}</p>
          {config.showButton && (
            <button
              onClick={handleReconnect}
              className={`flex items-center gap-2 px-4 py-2 text-white rounded-lg ${config.buttonColor}`}
            >
              <RotateCw className="w-4 h-4" />
              {config.buttonText}
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative h-full bg-[#1a1b26] ${className}`}>
      <div ref={terminalRef} className="h-full" />
      {renderStatusOverlay()}
    </div>
  );
}

export default Terminal;
