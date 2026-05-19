/**
 * MindFlow - Payroll Actions Component
 * Stub implementation - TODO: Full implementation
 */
'use client';

import { Button } from '@/components/ui/Button';

export function PayrollActions() {
  return (
    <div className="flex gap-3">
      <Button disabled>Run Payroll</Button>
      <Button variant="outline" disabled>Export</Button>
    </div>
  );
}
