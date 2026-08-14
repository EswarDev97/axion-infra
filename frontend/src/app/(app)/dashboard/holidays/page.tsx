/**
 * MindFlow - Holiday Calendar Page (Server Component)
 */

import type { Metadata } from 'next';
import { HolidayPageClient } from './HolidayPageClient';

export const metadata: Metadata = {
  title: 'Holiday Calendar - Wings Associates HRMS',
};

export default function HolidaysPage() {
  return <HolidayPageClient />;
}
