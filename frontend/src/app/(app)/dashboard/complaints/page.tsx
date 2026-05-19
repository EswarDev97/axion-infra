/**
 * MindFlow - Complaints Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { ComplaintsPageClient } from './ComplaintsPageClient';

export const metadata: Metadata = {
  title: 'Complaints - MindFlow',
};

export default function ComplaintsPage() {
  return <ComplaintsPageClient />;
}
