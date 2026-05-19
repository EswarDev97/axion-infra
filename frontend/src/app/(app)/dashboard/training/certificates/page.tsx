'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { certificateService } from '@/services/training';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { Pagination } from '@/components/data/Pagination';

export default function CertificatesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['certificates', { page, pageSize }],
    queryFn: () =>
      certificateService.list({
        page,
        pageSize,
      }),
  });

  if (isLoading) return <LoadingState message="Loading certificates..." />;
  if (error) return <ErrorState message="Failed to load certificates" onRetry={refetch} />;

  const certificates = data?.items || [];
  const totalPages = data?.totalPages || 1;

  const filteredCertificates = search
    ? certificates.filter((cert) =>
        cert.employeeName?.toLowerCase().includes(search.toLowerCase()) ||
        cert.courseName?.toLowerCase().includes(search.toLowerCase()) ||
        cert.certificateNumber.toLowerCase().includes(search.toLowerCase())
      )
    : certificates;

  const isExpired = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isExpiringSoon = (expiresAt: string | null | undefined) => {
    if (!expiresAt) return false;
    const expiry = new Date(expiresAt);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays && expiry > new Date();
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Certificates</h1>
          <p className="text-gray-600">View and verify training certificates</p>
        </div>
        <Link href="/dashboard/training/certificates/verify">
          <Button variant="outline">Verify Certificate</Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by name, course, or certificate number..."
          className="w-80"
        />
      </div>

      {/* Certificates List */}
      {filteredCertificates.length === 0 ? (
        <EmptyState
          title="No certificates found"
          description="Certificates are issued when employees complete courses"
        />
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Certificate #</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Employee</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Course</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Issued</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Expires</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCertificates.map((certificate) => (
                <tr key={certificate.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-mono text-sm">{certificate.certificateNumber}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{certificate.employeeName || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Link
                      href={`/dashboard/training/courses/${certificate.courseId}`}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      {certificate.courseName || '-'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(certificate.issuedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {certificate.expiresAt
                      ? new Date(certificate.expiresAt).toLocaleDateString()
                      : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    {isExpired(certificate.expiresAt) ? (
                      <Badge variant="red">Expired</Badge>
                    ) : isExpiringSoon(certificate.expiresAt) ? (
                      <Badge variant="yellow">Expiring Soon</Badge>
                    ) : (
                      <Badge variant="green">Valid</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/training/certificates/${certificate.id}`}>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </Link>
                      {certificate.certificateUrl && (
                        <a
                          href={certificate.certificateUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
