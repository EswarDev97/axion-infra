/**
 * MindFlow - Complaints Page Client Component
 * Per FRONTEND_ARCHITECTURE.md Section 4
 */

'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ComplaintList } from '@/components/complaints/ComplaintList';
import { ComplaintForm } from '@/components/complaints/ComplaintForm';
import { useComplaintStore } from '@/stores/complaintStore';
import type { Complaint, ComplaintFilters, ComplaintSeverity, ComplaintStatus } from '@/services/complaint/types';

const statusOptions: { value: ComplaintStatus | ''; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'NEW', label: 'New' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'WAITING_INFO', label: 'Waiting Info' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REOPENED', label: 'Reopened' },
];

const severityOptions: { value: ComplaintSeverity | ''; label: string }[] = [
  { value: '', label: 'All Severities' },
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

export function ComplaintsPageClient() {
  const router = useRouter();
  const { filters, setFilters, dashboardStats, fetchDashboardStats } = useComplaintStore();
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch dashboard stats on mount
  useState(() => {
    fetchDashboardStats();
  });

  const handleComplaintClick = useCallback((complaint: Complaint) => {
    router.push(`/dashboard/complaints/${complaint.id}`);
  }, [router]);

  const handleCreateComplaint = useCallback(() => {
    setShowComplaintForm(true);
  }, []);

  const handleComplaintCreated = useCallback((complaint: Complaint) => {
    setShowComplaintForm(false);
    router.push(`/dashboard/complaints/${complaint.id}`);
  }, [router]);

  const handleSearch = () => {
    setFilters({ search: searchQuery || undefined });
  };

  const handleStatusFilter = (status: string) => {
    setFilters({ status: status as ComplaintStatus || undefined });
  };

  const handleSeverityFilter = (severity: string) => {
    setFilters({ severity: severity as ComplaintSeverity || undefined });
  };

  const handleOverdueFilter = () => {
    setFilters({ overdue: filters.overdue ? undefined : true });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Complaints</h1>
          <p className="text-gray-600">Submit and track complaints</p>
        </div>
        <Button onClick={handleCreateComplaint}>
          <Plus className="h-4 w-4 mr-2" />
          New Complaint
        </Button>
      </div>

      {/* Stats Cards - Uses scoped (role-filtered) counts when available */}
      {dashboardStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Open</p>
                <p className="text-2xl font-bold">
                  {dashboardStats.openCount ?? dashboardStats.openComplaints}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Working</p>
                <p className="text-2xl font-bold">
                  {dashboardStats.workingCount ?? dashboardStats.inProgressComplaints}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-red-600">
                  {dashboardStats.overdueCount ?? dashboardStats.overdueResolution}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardStats.resolvedTodayCount ?? dashboardStats.resolvedToday}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
            <div className="relative flex-1 sm:max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.status || ''}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select
              value={filters.severity || ''}
              onChange={(e) => handleSeverityFilter(e.target.value)}
              className="w-full sm:w-40"
            >
              {severityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          {/* Overdue Toggle */}
          <button
            onClick={handleOverdueFilter}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.overdue
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Show Overdue Only
          </button>
        </div>
      </div>

      {/* Complaint List */}
      <ComplaintList filters={filters} onComplaintClick={handleComplaintClick} />

      {/* Complaint Form Modal */}
      <ComplaintForm
        isOpen={showComplaintForm}
        onClose={() => setShowComplaintForm(false)}
        onSuccess={handleComplaintCreated}
      />
    </div>
  );
}
