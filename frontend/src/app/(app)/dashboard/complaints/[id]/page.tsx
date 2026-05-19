/**
 * MindFlow - Complaint Detail Page
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

import { Metadata } from 'next';
import { ComplaintDetailPageClient } from './ComplaintDetailPageClient';

export const metadata: Metadata = {
  title: 'Complaint Details - MindFlow',
};

interface ComplaintDetailPageProps {
  params: { id: string };
}

export default function ComplaintDetailPage({ params }: ComplaintDetailPageProps) {
  return <ComplaintDetailPageClient complaintId={params.id} />;
}
