/**
 * MindFlow - Job Application Form Component
 * Stub implementation - TODO: Full implementation
 */
'use client';

export interface JobApplicationFormProps {
  jobId?: string;
  jobSlug?: string;
  jobTitle?: string;
}

export function JobApplicationForm({ jobId, jobSlug, jobTitle }: JobApplicationFormProps) {
  const identifier = jobSlug || jobId || 'unknown';
  return (
    <div className="space-y-4">
      <p className="text-gray-500 text-center">Job Application Form - Coming Soon</p>
      {jobTitle && <p className="text-sm text-gray-400 text-center">Applying for: {jobTitle}</p>}
      <p className="text-xs text-gray-300 text-center">Reference: {identifier}</p>
    </div>
  );
}
