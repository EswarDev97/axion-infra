import { useEffect, useState, useRef } from 'react';
import { Confetti } from './Confetti';
import { AgentAvatar } from '../AgentMissionControl/AgentAvatar';
import { Sparkles, Trophy } from 'lucide-react';

export interface CelebrationTrigger {
  featureId: number;
  featureName: string;
  agentName: string;
  timestamp: string;
}

interface Props {
  celebration: CelebrationTrigger;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function CelebrationOverlay({ celebration, onDismiss, autoDismissMs = 3000 }: Props) {
  const [isVisible, setIsVisible] = useState(true);
  const [scale, setScale] = useState(0.8);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Entry animation
    requestAnimationFrame(() => {
      setScale(1);
    });

    // Play success sound (very subtle)
    try {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH2LkZeWjYF0b2RhZXV8hJSHlIaGdo+FfHmHiYuOjo2KiYiGhYOEg4KBf359gH18eXp5eXh2dnV0dXVzc3JycnJycnJzc3Nzc3Nzc3R1dXV1dXV1dnZ2dnZ2d3d3d3d3d3h4eHh4eHh5eXl5eXl6enp6enp6enx8fHx8fH19fX19fX5+fn5+fn5+fn6BgYKCgoOEhYSFhoaIiIiJiYqKiouLjIyNjY6Oj4+QkZGSEhKTkpOUlJaWlpeXmJiYmZmampqbm5ycnJ2dnp6fn6CgoaGioqOjo6SlpaampaqqqqyrrKysrK2tra6urq+vr8DAwcHBwsLDw8TExMXFxcbGx8fIyMnJycrKysvLzMzNzc7Ozs7P0NDR0dHS0tLT09PU1NTV1dbW19fY2NnZ2drb29vc3N3d3d7e3t/f4ODh4eHi4uLj4+Pk5OXl5ebm5ufn6Ojp6enq6uvr7Ozt7e3u7u7v7/Aw8fHyMjJycrKysvLzMzNzc7Ozs7P0NDR0dHS0tLT09PU1NTV1dbW19fY2NnZ2drb29vc3N3d3d7e3t/f4ODh4eHi4uLj4+Pk5OXl5ebm5ufn6Ojp6enq6uvr7Ozt7e3u7u7v7/Aw8fHyMjJycrKysvLzMzNzc7Ozs7P0NDR0dHS0tLT09PU1NTV1dbW19fY2NnZ2drb29vc3N3d3d7e3t/f4ODh4eHi4uLj4+Pk5OXl5ebm5ufn6Ojp6enq6uvr7Ozt7e3u7u7v7/Aw8fHyMjJycrK');
      audioRef.current.volume = 0.1;
      audioRef.current.play().catch(() => {});
    } catch {
      // Ignore audio errors
    }

    // Auto-dismiss timer
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 400);
    }, autoDismissMs);

    // Escape key handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsVisible(false);
        setTimeout(onDismiss, 400);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [autoDismissMs, onDismiss]);

  return (
    <div
      className={`
        fixed inset-0 z-[100] flex items-center justify-center
        transition-opacity duration-400 ease-out
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={() => {
        setIsVisible(false);
        setTimeout(onDismiss, 400);
      }}
    >
      {/* Animated backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm">
        <div className="absolute inset-0 mc-grid-bg opacity-50" />
      </div>

      {/* Confetti */}
      <Confetti count={40} />

      {/* Content */}
      <div
        className="relative z-10 text-center transition-transform duration-500 ease-out"
        style={{ transform: `scale(${scale})` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Success Badge */}
        <div className="mb-6 relative">
          {/* Glowing ring */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-cyan-400/20 blur-xl animate-pulse" />
          </div>

          {/* Trophy icon */}
          <div className="relative">
            <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-cyan-500/30">
              <Trophy className="w-12 h-12 text-white" />
            </div>

            {/* Orbiting sparkles */}
            <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
              <Sparkles className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 w-5 h-5 text-yellow-400" />
            </div>
            <div className="absolute inset-0 animate-[spin_4s_linear_infinite_reverse]">
              <Sparkles className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-4 text-cyan-400" />
            </div>
          </div>
        </div>

        {/* Agent Avatar with success state */}
        <div className="mb-6 animate-celebrate">
          <AgentAvatar name={celebration.agentName} state="success" size="lg" />
        </div>

        {/* Content card */}
        <div className="mc-tech-border rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-950/95 backdrop-blur-xl p-8 max-w-md mx-auto shadow-2xl">
          {/* Status badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-green-400 mc-font-mono uppercase tracking-wider">
              Mission Complete
            </span>
          </div>

          {/* Success heading */}
          <h2 className="text-3xl font-bold text-white mb-3 mc-font-sans">
            Feature Complete!
          </h2>

          {/* Feature name */}
          <p className="text-xl text-cyan-400 mb-4 mc-font-mono">
            {celebration.featureName}
          </p>

          {/* Agent info */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mc-font-sans">
            <span>Completed by</span>
            <span className="text-purple-400 font-semibold">{celebration.agentName}</span>
          </div>

          {/* Decorative progress bar */}
          <div className="mt-6 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-green-500 w-full mc-progress-fill" />
          </div>
        </div>

        {/* Dismiss hint */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 mc-font-mono">
          <span className="px-2 py-1 rounded bg-gray-800/50 border border-gray-700/50 text-xs">
            Esc
          </span>
          <span>or click anywhere to dismiss</span>
        </div>
      </div>
    </div>
  );
}
