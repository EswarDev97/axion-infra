'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CrmLeadForm } from '@/components/crm/CrmLeadForm';
import { crmService, type CrmLead } from '@/services/crm';

export default function EditCrmLeadPage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<CrmLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    crmService
      .getById(id)
      .then(setLead)
      .catch(() => setError('Lead not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="text-gray-400 p-8">Loading...</div>;
  if (error || !lead) return <div className="text-red-500 p-8">{error ?? 'Lead not found.'}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Lead</h1>
          <p className="text-gray-500 text-sm mt-1">{lead.operatingOfficeName}</p>
        </div>
        <Link
          href={`/dashboard/crm/${id}`}
          className="text-gray-500 hover:text-gray-800 transition text-sm"
        >
          ← Back to Lead
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <CrmLeadForm lead={lead} />
      </div>
    </div>
  );
}
