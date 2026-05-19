/**
 * MindFlow - DataTable Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 */

'use client';

import { ReactNode, useState } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Pagination, type PaginationMeta } from '../Pagination';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (value: unknown, row: T, index: number) => ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField?: string;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  onRowClick?: (row: T) => void;
}

export function DataTable<T extends object>({
  columns,
  data,
  keyField = 'id',
  pagination,
  onPageChange,
  onSort,
  sortKey,
  sortDirection,
  loading = false,
  emptyMessage = 'No data available',
  className,
  rowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const handleSort = (key: string) => {
    if (!onSort) return;
    const newDirection =
      sortKey === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(key, newDirection);
  };

  const getNestedValue = (obj: T, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object' && part in (acc as object)) {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj as unknown);
  };

  const getSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4 text-primary-600" />
    ) : (
      <ArrowDown className="h-4 w-4 text-primary-600" />
    );
  };

  const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  style={{ width: column.width }}
                  className={cn(
                    'px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    alignClasses[column.align || 'left'],
                    column.sortable && 'cursor-pointer hover:bg-gray-100'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      column.align === 'center' && 'justify-center',
                      column.align === 'right' && 'justify-end'
                    )}
                  >
                    {column.header}
                    {column.sortable && getSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={String((row as Record<string, unknown>)[keyField] || rowIndex)}
                  className={cn(
                    'hover:bg-gray-50 transition-colors',
                    onRowClick && 'cursor-pointer',
                    typeof rowClassName === 'function'
                      ? rowClassName(row, rowIndex)
                      : rowClassName
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => {
                    const value = getNestedValue(row, column.key);
                    return (
                      <td
                        key={column.key}
                        className={cn(
                          'px-4 py-3 text-sm text-gray-900',
                          alignClasses[column.align || 'left']
                        )}
                      >
                        {column.render
                          ? column.render(value, row, rowIndex)
                          : String(value ?? '')}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && onPageChange && (
        <div className="mt-4">
          <Pagination meta={pagination} onPageChange={onPageChange} />
        </div>
      )}
    </div>
  );
}
