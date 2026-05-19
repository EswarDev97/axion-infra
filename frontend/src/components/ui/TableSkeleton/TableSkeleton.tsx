/**
 * MindFlow - Table Skeleton Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

// Deterministic width pattern for skeleton cells to avoid hydration mismatch
const widthPattern = [75, 60, 85, 70, 80, 65, 90, 72, 78, 68];

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
  return (
    <div className="w-full overflow-hidden border rounded-lg animate-pulse">
      <table className="w-full">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <div className="h-4 bg-gray-200 rounded w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-4 py-3">
                  <div
                    className="h-4 bg-gray-200 rounded"
                    style={{ width: `${widthPattern[(rowIndex * columns + colIndex) % widthPattern.length]}%` }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
