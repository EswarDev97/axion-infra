/**
 * MindFlow - Document Upload Component
 * Stub implementation - TODO: Full implementation in Phase 7+
 */
'use client';

import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function DocumentUpload() {
  return (
    <Button disabled>
      <Upload className="w-4 h-4 mr-2" />
      Upload Document
    </Button>
  );
}
