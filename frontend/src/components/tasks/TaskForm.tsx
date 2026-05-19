/**
 * MindFlow - Task Form Component
 * Per FRONTEND_ARCHITECTURE.md Section 3
 * Enhanced with department-based employee assignment
 */

'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/feedback/Alert';
import { Modal, ModalFooter } from '@/components/feedback/Modal';
import { FormField } from '@/components/form/FormField';
import { useTaskStore } from '@/stores/taskStore';
import { departmentService, employeeService } from '@/services/hr/hrService';
import type { Department, Employee } from '@/services/hr/types';
import type { Task, TaskCreateRequest, TaskUpdateRequest, TaskPriority } from '@/services/task/types';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatusId?: string;
  defaultParentTaskId?: string;
  onSuccess?: (task: Task) => void;
}

const priorityOptions: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
];

export function TaskForm({
  isOpen,
  onClose,
  task,
  defaultStatusId,
  defaultParentTaskId,
  onSuccess,
}: TaskFormProps) {
  const { statuses, fetchStatuses, createTask, updateTask } = useTaskStore();
  const isEditing = !!task;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Department & Employee state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    statusId: '',
    priority: 'MEDIUM' as TaskPriority,
    departmentId: '',
    assigneeId: '',
    dueDate: '',
    startDate: '',
    estimatedHours: '',
    tags: '',
    parentTaskId: '',
  });

  // Fetch statuses and departments when form opens
  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
      loadDepartments();
    }
  }, [isOpen, fetchStatuses]);

  const loadDepartments = async () => {
    try {
      const response = await departmentService.list({ pageSize: 100 });
      setDepartments(response.items);
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  // Load employees when department changes
  useEffect(() => {
    if (formData.departmentId) {
      loadEmployeesByDepartment(formData.departmentId);
    } else {
      setEmployees([]);
      setFormData((prev) => ({ ...prev, assigneeId: '' }));
    }
  }, [formData.departmentId]);

  const loadEmployeesByDepartment = async (departmentId: string) => {
    setLoadingEmployees(true);
    try {
      const response = await employeeService.list({
        departmentId,
        status: 'ACTIVE',
        pageSize: 100,
      });
      setEmployees(response.items);
    } catch (err) {
      console.error('Failed to load employees:', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Populate form when editing
  useEffect(() => {
    if (task) {
      const assignee = task.assignees?.[0];
      setFormData({
        title: task.title,
        description: task.description || '',
        statusId: task.statusId,
        priority: task.priority,
        departmentId: task.departmentId || '',
        assigneeId: assignee?.userId || '',
        dueDate: task.dueDate || '',
        startDate: task.startDate || '',
        estimatedHours: task.estimatedHours?.toString() || '',
        tags: task.tags?.join(', ') || '',
        parentTaskId: task.parentTaskId || '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        statusId: defaultStatusId || '',
        priority: 'MEDIUM',
        departmentId: '',
        assigneeId: '',
        dueDate: '',
        startDate: '',
        estimatedHours: '',
        tags: '',
        parentTaskId: defaultParentTaskId || '',
      });
    }
  }, [task, defaultStatusId, defaultParentTaskId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate required assignment fields
    if (!formData.departmentId) {
      setError('Please select a department');
      setLoading(false);
      return;
    }
    if (!formData.assigneeId) {
      setError('Please select an employee to assign the task');
      setLoading(false);
      return;
    }

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

      let result: Task | null;

      if (isEditing && task) {
        const updateData: TaskUpdateRequest = {
          title: formData.title,
          description: formData.description || null,
          statusId: formData.statusId || undefined,
          priority: formData.priority,
          departmentId: formData.departmentId || null,
          dueDate: formData.dueDate || null,
          startDate: formData.startDate || null,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : null,
          tags: tagsArray,
          parentTaskId: formData.parentTaskId || null,
          assigneeIds: formData.assigneeId ? [formData.assigneeId] : [],
        };
        result = await updateTask(task.id, updateData);
      } else {
        const createData: TaskCreateRequest = {
          title: formData.title,
          description: formData.description || undefined,
          statusId: formData.statusId || undefined,
          priority: formData.priority,
          departmentId: formData.departmentId || undefined,
          dueDate: formData.dueDate || undefined,
          startDate: formData.startDate || undefined,
          estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
          tags: tagsArray.length > 0 ? tagsArray : undefined,
          parentTaskId: formData.parentTaskId || undefined,
          assigneeIds: formData.assigneeId ? [formData.assigneeId] : undefined,
        };
        result = await createTask(createData);
      }

      if (result) {
        if (onSuccess) {
          onSuccess(result);
        }
        handleClose();
      } else {
        setError('Failed to save task');
      }
    } catch (err) {
      setError((err as Error).message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      statusId: defaultStatusId || '',
      priority: 'MEDIUM',
      departmentId: '',
      assigneeId: '',
      dueDate: '',
      startDate: '',
      estimatedHours: '',
      tags: '',
      parentTaskId: '',
    });
    setError(null);
    setEmployees([]);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Task' : 'Create Task'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <FormField label="Title" required>
          <Input
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Enter task title..."
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Describe the task..."
            rows={3}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Priority">
            <Select
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </FormField>

          {isEditing && (
            <FormField label="Status">
              <Select
                value={formData.statusId}
                onChange={(e) => handleChange('statusId', e.target.value)}
              >
                <option value="">Select Status</option>
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </Select>
            </FormField>
          )}
        </div>

        {/* Department & Employee Assignment */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Department" required>
            <Select
              value={formData.departmentId}
              onChange={(e) => handleChange('departmentId', e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </FormField>

          <FormField label="Assign Employee" required>
            <Select
              value={formData.assigneeId}
              onChange={(e) => handleChange('assigneeId', e.target.value)}
              disabled={!formData.departmentId || loadingEmployees}
            >
              <option value="">
                {loadingEmployees
                  ? 'Loading employees...'
                  : !formData.departmentId
                    ? 'Select department first'
                    : 'Select Employee'}
              </option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.userId || emp.id}>
                  {emp.fullName} ({emp.employeeCode})
                </option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Due Date">
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
            />
          </FormField>

          <FormField label="Estimated Hours">
            <Input
              type="number"
              min="0"
              step="0.5"
              value={formData.estimatedHours}
              onChange={(e) => handleChange('estimatedHours', e.target.value)}
              placeholder="0"
            />
          </FormField>
        </div>

        <FormField label="Tags">
          <Input
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="Enter tags separated by commas..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Separate tags with commas (e.g., frontend, urgent, bug)
          </p>
        </FormField>

        <ModalFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} disabled={!formData.title.trim()}>
            {isEditing ? 'Update Task' : 'Create Task'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
