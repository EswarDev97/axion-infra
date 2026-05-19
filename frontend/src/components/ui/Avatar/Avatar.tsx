/**
 * MindFlow - Avatar Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.1
 */

import { cn } from '@/utils/cn';

export interface AvatarProps {
  src?: string | null;
  name?: string;
  // Alternative prop names for compatibility
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getColorFromName(name?: string): string {
  if (!name) return 'bg-gray-400';

  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ src, name, alt, fallback, size = 'md', className }: AvatarProps) {
  // Support both name and alt/fallback props
  const displayName = name || alt;
  const displayFallback = fallback || getInitials(displayName);
  const bgColor = getColorFromName(displayName);

  return (
    <div
      className={cn(
        'relative inline-flex items-center justify-center rounded-full overflow-hidden',
        sizeClasses[size],
        className
      )}
    >
      {src ? (
        <img
          src={src}
          alt={displayName || 'Avatar'}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center h-full w-full font-medium text-white',
            bgColor
          )}
        >
          {displayFallback}
        </div>
      )}
    </div>
  );
}
