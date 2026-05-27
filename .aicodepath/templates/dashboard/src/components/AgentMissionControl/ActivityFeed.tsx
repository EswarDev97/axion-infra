import { formatDistanceToNow } from 'date-fns';
import './styles.css';

export interface ActivityItem {
  type: string;
  description: string;
  timestamp: string;
  agentName?: string;
  featureId?: number;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  maxItems?: number;
  className?: string;
}

const ACTIVITY_TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  agent: {
    icon: '🤖',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-950/30',
    borderColor: 'border-cyan-500/30',
    label: 'AGENT',
  },
  phase: {
    icon: '📍',
    color: 'text-purple-400',
    bgColor: 'bg-purple-950/30',
    borderColor: 'border-purple-500/30',
    label: 'PHASE',
  },
  checkpoint: {
    icon: '💾',
    color: 'text-amber-400',
    bgColor: 'bg-amber-950/30',
    borderColor: 'border-amber-500/30',
    label: 'SAVE',
  },
  error: {
    icon: '❌',
    color: 'text-red-400',
    bgColor: 'bg-red-950/30',
    borderColor: 'border-red-500/30',
    label: 'ERROR',
  },
  success: {
    icon: '✅',
    color: 'text-green-400',
    bgColor: 'bg-green-950/30',
    borderColor: 'border-green-500/30',
    label: 'SUCCESS',
  },
  feature: {
    icon: '⚡',
    color: 'text-blue-400',
    bgColor: 'bg-blue-950/30',
    borderColor: 'border-blue-500/30',
    label: 'FEATURE',
  },
};

const DEFAULT_CONFIG = {
  icon: '📋',
  color: 'text-gray-400',
  bgColor: 'bg-gray-950/30',
  borderColor: 'border-gray-500/30',
  label: 'SYSTEM',
};

export function ActivityFeed({
  activities,
  maxItems = 10,
  className = '',
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems);

  if (displayActivities.length === 0) {
    return (
      <div className={`
        mc-tech-border
        rounded-xl
        bg-gradient-to-br
        from-gray-900/50
        to-gray-950/50
        p-8
        text-center
        ${className}
      `}>
        <div className="text-4xl mb-3 opacity-50">📭</div>
        <p className="text-gray-500 mc-font-mono text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="mc-font-sans font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          Activity Feed
        </h3>
        <span className="text-xs text-gray-500 mc-font-mono">
          LAST {Math.min(maxItems, activities.length)} EVENTS
        </span>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-8 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500/50 via-purple-500/50 to-transparent" />

        {/* Activity items */}
        <div className="space-y-2">
          {displayActivities.map((activity, index) => (
            <ActivityItem
              key={`${activity.timestamp}-${index}`}
              activity={activity}
              index={index}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface ActivityItemProps {
  activity: ActivityItem;
  index: number;
}

function ActivityItem({ activity, index }: ActivityItemProps) {
  const config = ACTIVITY_TYPE_CONFIG[activity.type] || DEFAULT_CONFIG;

  const timeAgo = formatDistanceToNow(new Date(activity.timestamp), {
    addSuffix: true,
  });

  // Format time for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  return (
    <div
      className={`
        mc-card-hover
        relative
        flex
        items-start
        gap-3
        p-3
        rounded-lg
        ${config.bgColor}
        border
        ${config.borderColor}
        mc-animate-fade-in-up
      `}
      style={{
        animationDelay: `${index * 50}ms`,
      }}
    >
      {/* Icon */}
      <div className={`
        flex-shrink-0
        w-10
        h-10
        rounded-lg
        ${config.bgColor}
        border
        ${config.borderColor}
        flex
        items-center
        justify-center
        text-lg
        z-10
        relative
      `}>
        {config.icon}

        {/* Glow effect */}
        <div className={`
          absolute
          inset-0
          rounded-lg
          ${config.color.replace('text-', 'bg-')}
          opacity-20
          blur-md
        `} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type label */}
            <span className={`
              text-xs
              font-bold
              px-1.5
              py-0.5
              rounded
              ${config.bgColor}
              ${config.borderColor}
              border
              ${config.color}
              mc-font-mono
            `}>
              {config.label}
            </span>

            {/* Agent name if available */}
            {activity.agentName && (
              <span className="text-xs text-cyan-400 mc-font-mono">
                {activity.agentName}
              </span>
            )}

            {/* Feature ID if available */}
            {activity.featureId !== undefined && (
              <span className="text-xs text-gray-600 mc-font-mono">
                #{activity.featureId.toString().padStart(4, '0')}
              </span>
            )}
          </div>

          {/* Timestamp */}
          <span className="text-xs text-gray-600 mc-font-mono whitespace-nowrap">
            {formatTime(activity.timestamp)}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 leading-snug">
          {activity.description}
        </p>

        {/* Relative time */}
        <span className="text-xs text-gray-600 mc-font-mono mt-1 inline-block">
          {timeAgo}
        </span>
      </div>

      {/* Timeline dot */}
      <div className={`
        absolute
        left-[15px]
        top-1/2
        -translate-y-1/2
        w-1.5
        h-1.5
        rounded-full
        ${config.color.replace('text-', 'bg-')}
        -z-10
      `} />
    </div>
  );
}
