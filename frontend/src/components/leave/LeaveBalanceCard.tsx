/**
 * MindFlow - Leave Balance Card Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

'use client';

import { useEffect, useState } from 'react';
import { leaveBalanceService, type LeaveBalance } from '@/services/hr';

interface LeaveBalanceCardProps {
  employeeId?: string;
  year?: number;
}

export function LeaveBalanceCard({ employeeId, year }: LeaveBalanceCardProps) {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [loading, setLoading] = useState(true);

  const currentYear = year || new Date().getFullYear();

  useEffect(() => {
    const fetchBalances = async () => {
      setLoading(true);
      try {
        let result: LeaveBalance[];
        if (employeeId) {
          result = await leaveBalanceService.getByEmployee(employeeId, currentYear);
        } else {
          result = await leaveBalanceService.getCurrentUserBalances(currentYear);
        }
        setBalances(result);
      } catch (error) {
        console.error('Failed to fetch leave balances:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBalances();
  }, [employeeId, currentYear]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6 text-center text-gray-500">
        No leave balances available for {currentYear}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.map((balance) => {
        const usedPercentage = balance.totalDays > 0
          ? Math.round((balance.usedDays / balance.totalDays) * 100)
          : 0;

        return (
          <div key={balance.id} className="bg-white rounded-lg border p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              {balance.leaveTypeName}
            </h3>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-bold text-gray-900">
                {balance.availableDays}
              </span>
              <span className="text-sm text-gray-500 mb-1">
                / {balance.totalDays} days
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${usedPercentage}%` }}
                />
              </div>
            </div>

            {/* Details */}
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-gray-500">
              <div>
                <p className="font-medium text-gray-600">{balance.usedDays}</p>
                <p>Used</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">{balance.pendingDays}</p>
                <p>Pending</p>
              </div>
              <div>
                <p className="font-medium text-gray-600">{balance.carriedOverDays}</p>
                <p>Carry Over</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
