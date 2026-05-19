/**
 * MindFlow - Department Tree Component
 * Hierarchical tree view of departments
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { departmentService, type Department } from '@/services/hr';

interface TreeNode extends Department {
  children: TreeNode[];
}

function buildTree(departments: Department[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  // Initialize all nodes
  departments.forEach((dept) => {
    map.set(dept.id, { ...dept, children: [] });
  });

  // Build parent-child relationships
  departments.forEach((dept) => {
    const node = map.get(dept.id)!;
    if (dept.parentId && map.has(dept.parentId)) {
      map.get(dept.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function TreeNodeComponent({
  node,
  level = 0,
}: {
  node: TreeNode;
  level?: number;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer group"
        style={{ paddingLeft: `${level * 24 + 12}px` }}
        onClick={() => router.push(`/dashboard/departments/${node.id}`)}
      >
        {/* Expand/Collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`h-4 w-4 transition-transform ${expanded ? 'rotate-90' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        ) : (
          <span className="w-5 h-5 flex items-center justify-center text-gray-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="4" />
            </svg>
          </span>
        )}

        {/* Department Icon */}
        <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-primary-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>

        {/* Department Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">{node.name}</span>
            <Badge variant="neutral" size="sm">{node.code}</Badge>
            {!node.isActive && <Badge variant="error" size="sm">Inactive</Badge>}
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-3">
            {node.managerName && <span>Manager: {node.managerName}</span>}
            <span>{node.employeeCount} employees</span>
            {hasChildren && <span>{node.children.length} sub-departments</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="hidden group-hover:flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/dashboard/departments/${node.id}/edit`);
            }}
          >
            Edit
          </Button>
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeComponent key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentTree() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await departmentService.list({ pageSize: 200 });
        setDepartments(response.items);
      } catch (err) {
        setError((err as Error).message || 'Failed to load departments');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading department tree...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" onClose={() => setError(null)}>
        {error}
      </Alert>
    );
  }

  const tree = buildTree(departments);

  if (tree.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <p className="text-gray-500">No departments found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="space-y-0.5">
        {tree.map((node) => (
          <TreeNodeComponent key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
