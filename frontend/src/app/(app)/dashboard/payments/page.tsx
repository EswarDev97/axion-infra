import { Metadata } from 'next';
import { PaymentsPageClient } from './PaymentsPageClient';

export const metadata: Metadata = {
  title: 'Payments - MindFlow',
};

export default function PaymentsPage() {
  return <PaymentsPageClient />;
}
