'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { preferenceService } from '@/services/notification';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Button } from '@/components/ui/Button';

export default function NotificationPreferencesPage() {
  const queryClient = useQueryClient();

  // Fetch preferences
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => preferenceService.list(),
  });

  // Update preference mutation
  const updateMutation = useMutation({
    mutationFn: ({ type, field, value }: { type: string; field: string; value: boolean }) =>
      preferenceService.update(type, { [field]: value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  // Disable all emails mutation
  const disableEmailsMutation = useMutation({
    mutationFn: () => preferenceService.disableAllEmails(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  // Enable all in-app mutation
  const enableInAppMutation = useMutation({
    mutationFn: () => preferenceService.enableAllInApp(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
    },
  });

  if (isLoading) return <LoadingState message="Loading preferences..." />;
  if (error) return <ErrorState message="Failed to load preferences" onRetry={refetch} />;

  const preferences = data?.items || [];

  // Group preferences by category
  const groupedPreferences: Record<string, typeof preferences> = {};
  preferences.forEach((pref) => {
    const category = pref.notificationType.split('_')[0];
    const categoryName = {
      task: 'Tasks',
      leave: 'Leave',
      expense: 'Expenses',
      training: 'Training',
      complaint: 'Complaints',
      approval: 'Approvals',
      announcement: 'Announcements',
      system: 'System',
    }[category] || 'Other';

    if (!groupedPreferences[categoryName]) {
      groupedPreferences[categoryName] = [];
    }
    groupedPreferences[categoryName].push(pref);
  });

  const handleToggle = (type: string, field: string, currentValue: boolean) => {
    updateMutation.mutate({ type, field, value: !currentValue });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/dashboard/notifications"
              className="text-gray-500 hover:text-gray-700"
            >
              ← Back to Notifications
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Notification Preferences</h1>
          <p className="text-gray-600">Control how you receive notifications</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Button
          variant="outline"
          onClick={() => enableInAppMutation.mutate()}
          isLoading={enableInAppMutation.isPending}
        >
          Enable All In-App
        </Button>
        <Button
          variant="outline"
          onClick={() => disableEmailsMutation.mutate()}
          isLoading={disableEmailsMutation.isPending}
        >
          Disable All Emails
        </Button>
      </div>

      {/* Preferences Grid */}
      <div className="space-y-6">
        {Object.entries(groupedPreferences).map(([category, prefs]) => (
          <div key={category} className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-lg font-semibold">{category}</h2>
            </div>
            <div className="divide-y">
              {prefs.map((pref) => (
                <div
                  key={pref.notificationType}
                  className="px-6 py-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="font-medium">{pref.displayName}</h3>
                    <p className="text-sm text-gray-500">{pref.notificationType}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.inAppEnabled}
                        onChange={() => handleToggle(pref.notificationType, 'inAppEnabled', pref.inAppEnabled)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">In-App</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.emailEnabled}
                        onChange={() => handleToggle(pref.notificationType, 'emailEnabled', pref.emailEnabled)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pref.pushEnabled}
                        onChange={() => handleToggle(pref.notificationType, 'pushEnabled', pref.pushEnabled)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm">Push</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
