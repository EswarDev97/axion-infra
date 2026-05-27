interface Props {
  isConnected: boolean;
  reconnectAttempts: number;
}

export function ConnectionStatus({ isConnected, reconnectAttempts }: Props) {
  if (isConnected) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </span>
        <span className="text-sm font-medium">Live</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-yellow-600">
      <span className="relative flex h-3 w-3">
        <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
      </span>
      <span className="text-sm font-medium">
        Reconnecting{reconnectAttempts > 0 ? ` (${reconnectAttempts})` : '...'}
      </span>
    </div>
  );
}
