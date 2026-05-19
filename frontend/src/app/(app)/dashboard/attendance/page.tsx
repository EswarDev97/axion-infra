/**
 * MindFlow - Attendance Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { AttendancePageClient } from './AttendancePageClient';

export const metadata: Metadata = {
  title: 'Attendance - AxionPCS HRMS',
};

interface AttendancePageProps {
  searchParams: {
    view?: 'my' | 'team' | 'all';
    startDate?: string;
    endDate?: string;
    department?: string;
  };
}

export default function AttendancePage({ searchParams }: AttendancePageProps) {
  return <AttendancePageClient view={searchParams.view || 'my'} />;
}
