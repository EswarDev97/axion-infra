import { Metadata } from 'next';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { AttendanceWidget } from '@/components/dashboard/AttendanceWidget';
import { LeaveWidget } from '@/components/dashboard/LeaveWidget';
import { AnnouncementsWidget } from '@/components/dashboard/AnnouncementsWidget';
import { QuickActions } from '@/components/dashboard/QuickActions';

export const metadata: Metadata = {
  title: 'Dashboard - AxionPCS HRMS',
};

export default async function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s your overview.</p>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          <AttendanceWidget />
          <LeaveWidget />
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          <QuickActions />
          <AnnouncementsWidget />
        </div>
      </div>
    </div>
  );
}
