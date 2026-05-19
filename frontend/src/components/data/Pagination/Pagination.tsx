/**
 * MindFlow - Pagination Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2
 * Supports both meta object and individual props for backwards compatibility
 */

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginationProps {
  // New pattern: use meta object
  meta?: PaginationMeta;
  // Legacy pattern: individual props
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  totalItems?: number;
  // Common props
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
  className?: string;
}

export function Pagination({
  meta,
  currentPage,
  totalPages: totalPagesLegacy,
  pageSize: pageSizeLegacy = 20,
  totalItems: totalItemsLegacy,
  onPageChange,
  showPageNumbers = true,
  className,
}: PaginationProps) {
  // Support both patterns
  const page = meta?.page ?? currentPage ?? 1;
  const totalPages = meta?.totalPages ?? totalPagesLegacy ?? 1;
  const pageSize = meta?.pageSize ?? pageSizeLegacy;
  const totalItems = meta?.totalItems ?? totalItemsLegacy ?? (totalPages * pageSize);
  const hasNext = meta?.hasNext ?? (page < totalPages);
  const hasPrevious = meta?.hasPrevious ?? (page > 1);

  // Calculate visible page numbers
  const getPageNumbers = () => {
    const delta = 2;
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i);
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      if (!rangeWithDots.includes(totalPages)) {
        rangeWithDots.push(totalPages);
      }
    }

    return rangeWithDots;
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-4',
        className
      )}
    >
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium">{startItem}</span> to{' '}
        <span className="font-medium">{endItem}</span> of{' '}
        <span className="font-medium">{totalItems}</span> results
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPrevious}
          aria-label="Go to first page"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          aria-label="Go to previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {showPageNumbers && (
          <div className="flex items-center gap-1 mx-2">
            {getPageNumbers().map((pageNum, idx) =>
              typeof pageNum === 'string' ? (
                <span key={`dots-${idx}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </Button>
              )
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          aria-label="Go to next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNext}
          aria-label="Go to last page"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
