import { Metadata } from 'next';
import Link from 'next/link';
import { CrmLeadForm } from '@/components/crm/CrmLeadForm';

export const metadata: Metadata = {
  title: 'Add Lead - CRM - MindFlow',
};

export default function NewCrmLeadPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
          <p className="text-gray-500 text-sm mt-1">
            Record a new Operating Office outreach
          </p>
        </div>
        <Link
          href="/dashboard/crm"
          className="text-gray-500 hover:text-gray-800 transition text-sm"
        >
          ← Back to Leads
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <CrmLeadForm />
      </div>
    </div>
  );
}
