'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { INTEREST_LEVEL_LABELS, type InterestLevel } from '@/services/crm';

export function CrmLeadFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') ?? '');
  const [interestLevel, setInterestLevel] = useState(searchParams.get('interestLevel') ?? '');
  const [overdueOnly, setOverdueOnly] = useState(searchParams.get('overdueOnly') === 'true');

  const apply = () => {
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (interestLevel) p.set('interestLevel', interestLevel);
    if (overdueOnly) p.set('overdueOnly', 'true');
    p.set('page', '1');
    router.push(`/dashboard/crm?${p.toString()}`);
  };

  const clear = () => {
    setSearch('');
    setInterestLevel('');
    setOverdueOnly(false);
    router.push('/dashboard/crm');
  };

  const hasFilters = search || interestLevel || overdueOnly;

  return (
    <div className="bg-white p-4 rounded-lg border space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Office name or location..."
            onKeyDown={(e) => e.key === 'Enter' && apply()}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interest Level</label>
          <Select value={interestLevel} onChange={(e) => setInterestLevel(e.target.value)}>
            <option value="">All</option>
            {(Object.keys(INTEREST_LEVEL_LABELS) as InterestLevel[]).map((k) => (
              <option key={k} value={k}>{INTEREST_LEVEL_LABELS[k]}</option>
            ))}
          </Select>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300 text-primary-600"
            />
            Overdue follow-ups only
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {hasFilters && (
          <Button variant="outline" size="sm" onClick={clear}>Clear</Button>
        )}
        <Button size="sm" onClick={apply}>Apply Filters</Button>
      </div>
    </div>
  );
}
