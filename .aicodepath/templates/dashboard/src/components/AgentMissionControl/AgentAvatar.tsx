interface AgentAvatarProps {
  name: string;
  state: 'thinking' | 'working' | 'testing' | 'success' | 'error';
  size?: 'sm' | 'md' | 'lg';
  showGlow?: boolean;
  className?: string;
}

const AVATAR_CONFIG: Record<string, {
  emoji: string;
  gradient: string;
  glowColor: string;
}> = {
  Coder: {
    emoji: '👨‍💻',
    gradient: 'linear-gradient(135deg, #0066ff, #00f5ff)',
    glowColor: 'rgba(0, 245, 255, 0.4)',
  },
  Builder: {
    emoji: '🏗️',
    gradient: 'linear-gradient(135deg, #ff6600, #ffb000)',
    glowColor: 'rgba(255, 176, 0, 0.4)',
  },
  Architect: {
    emoji: '📐',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    glowColor: 'rgba(168, 85, 247, 0.4)',
  },
  Tester: {
    emoji: '🧪',
    gradient: 'linear-gradient(135deg, #059669, #22c55e)',
    glowColor: 'rgba(34, 197, 94, 0.4)',
  },
  Reviewer: {
    emoji: '🔍',
    gradient: 'linear-gradient(135deg, #ca8a04, #eab308)',
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  Developer: {
    emoji: '💻',
    gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)',
    glowColor: 'rgba(99, 102, 241, 0.4)',
  },
  Engineer: {
    emoji: '⚙️',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    glowColor: 'rgba(100, 116, 139, 0.4)',
  },
};

const STATE_ANIMATIONS: Record<string, string> = {
  thinking: 'mc-animate-thinking',
  working: 'mc-animate-working',
  testing: 'mc-animate-testing',
  success: '',
  error: '',
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 text-base',
  md: 'w-12 h-12 text-2xl',
  lg: 'w-16 h-16 text-3xl',
};

export function AgentAvatar({
  name,
  state,
  size = 'md',
  showGlow = true,
  className = '',
}: AgentAvatarProps) {
  const config = AVATAR_CONFIG[name] || {
    emoji: '🤖',
    gradient: 'linear-gradient(135deg, #475569, #64748b)',
    glowColor: 'rgba(100, 116, 139, 0.4)',
  };

  const animationClass = STATE_ANIMATIONS[state] || '';
  const sizeClass = SIZE_CLASSES[size];

  const glowStyle = showGlow ? {
    boxShadow: `0 0 ${size === 'sm' ? '12' : size === 'md' ? '16' : '20'}px ${config.glowColor}`,
  } : {};

  return (
    <div
      className={`
        ${sizeClass}
        rounded-lg
        flex
        items-center
        justify-center
        font-normal
        transition-all
        duration-300
        ${animationClass}
        ${className}
      `}
      style={{
        background: config.gradient,
        ...glowStyle,
      }}
    >
      <span className="filter drop-shadow-sm">{config.emoji}</span>
    </div>
  );
}
