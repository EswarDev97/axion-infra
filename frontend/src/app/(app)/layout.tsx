import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';
import { AppContent } from '@/components/layout/AppContent';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side auth check
  const cookieStore = cookies();
  const token = cookieStore.get('accessToken');

  if (!token) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppSidebar />
      <AppContent>
        <AppHeader />
        <main className="p-6">{children}</main>
      </AppContent>
    </div>
  );
}
