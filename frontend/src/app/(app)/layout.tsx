import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { AppHeader } from '@/components/layout/AppHeader';

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
      <div className="lg:pl-64">
        <AppHeader />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
