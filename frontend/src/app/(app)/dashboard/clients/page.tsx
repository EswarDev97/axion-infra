import { Metadata } from 'next';
import { ClientsPageClient } from './ClientsPageClient';

export const metadata: Metadata = {
  title: 'Clients - MindFlow',
};

export default function ClientsPage() {
  return <ClientsPageClient />;
}
