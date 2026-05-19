/**
 * MSW Request Handlers
 * Per SDLC Phase 7 - Testing & Quality Assurance
 *
 * Mock API responses for frontend testing
 */

import { http, HttpResponse } from 'msw';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Mock user data
const mockUser = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  email: 'test@mindflow.com',
  first_name: 'Test',
  last_name: 'User',
  is_active: true,
  roles: ['EMPLOYEE'],
};

// Mock tenant data
const mockTenant = {
  id: '550e8400-e29b-41d4-a716-446655440001',
  name: 'Test Company',
  subdomain: 'test',
  is_active: true,
};

// Mock employees
const mockEmployees = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    employee_number: 'EMP001',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@test.com',
    department: { id: '1', name: 'Engineering' },
    position: { id: '1', title: 'Developer' },
    is_active: true,
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    employee_number: 'EMP002',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@test.com',
    department: { id: '2', name: 'HR' },
    position: { id: '2', title: 'HR Manager' },
    is_active: true,
  },
];

// Mock departments
const mockDepartments = [
  { id: '1', name: 'Engineering', code: 'ENG' },
  { id: '2', name: 'Human Resources', code: 'HR' },
  { id: '3', name: 'Finance', code: 'FIN' },
];

// Mock tasks
const mockTasks = [
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    title: 'Complete project documentation',
    description: 'Write technical docs',
    priority: 'HIGH',
    status: { id: '1', name: 'In Progress' },
    due_date: '2026-02-15',
    assignees: [mockUser],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440021',
    title: 'Review code changes',
    description: 'Code review for PR #123',
    priority: 'MEDIUM',
    status: { id: '2', name: 'Pending' },
    due_date: '2026-01-20',
    assignees: [],
  },
];

export const handlers = [
  // Auth handlers
  http.post(`${API_BASE}/api/v1/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'test@mindflow.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          user: mockUser,
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: { message: 'Invalid credentials' } },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/api/v1/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  http.get(`${API_BASE}/api/v1/auth/me`, () => {
    return HttpResponse.json({
      success: true,
      data: mockUser,
    });
  }),

  http.post(`${API_BASE}/api/v1/auth/refresh`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        access_token: 'new-mock-access-token',
      },
    });
  }),

  // User handlers
  http.get(`${API_BASE}/api/v1/users`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [mockUser],
        total: 1,
        page: 1,
        limit: 20,
      },
    });
  }),

  http.get(`${API_BASE}/api/v1/users/:id`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: mockUser,
    });
  }),

  // Employee handlers
  http.get(`${API_BASE}/api/v1/hr/employees`, ({ request }) => {
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';

    let filteredEmployees = mockEmployees;
    if (search) {
      filteredEmployees = mockEmployees.filter(
        emp => emp.first_name.toLowerCase().includes(search.toLowerCase()) ||
               emp.last_name.toLowerCase().includes(search.toLowerCase())
      );
    }

    return HttpResponse.json({
      success: true,
      data: {
        items: filteredEmployees,
        total: filteredEmployees.length,
        page: 1,
        limit: 20,
      },
    });
  }),

  http.get(`${API_BASE}/api/v1/hr/employees/:id`, ({ params }) => {
    const employee = mockEmployees.find(e => e.id === params.id);
    if (employee) {
      return HttpResponse.json({ success: true, data: employee });
    }
    return HttpResponse.json(
      { success: false, error: { message: 'Employee not found' } },
      { status: 404 }
    );
  }),

  // Department handlers
  http.get(`${API_BASE}/api/v1/hr/departments`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: mockDepartments,
        total: mockDepartments.length,
        page: 1,
        limit: 20,
      },
    });
  }),

  // Task handlers
  http.get(`${API_BASE}/api/v1/tasks`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: mockTasks,
        total: mockTasks.length,
        page: 1,
        limit: 20,
      },
    });
  }),

  http.get(`${API_BASE}/api/v1/tasks/:id`, ({ params }) => {
    const task = mockTasks.find(t => t.id === params.id);
    if (task) {
      return HttpResponse.json({ success: true, data: task });
    }
    return HttpResponse.json(
      { success: false, error: { message: 'Task not found' } },
      { status: 404 }
    );
  }),

  http.post(`${API_BASE}/api/v1/tasks`, async ({ request }) => {
    const body = await request.json() as { title: string; description?: string };
    const newTask = {
      id: '550e8400-e29b-41d4-a716-446655440099',
      ...body,
      status: { id: '1', name: 'Pending' },
      assignees: [],
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, data: newTask }, { status: 201 });
  }),

  // Leave handlers
  http.get(`${API_BASE}/api/v1/hr/leave/requests`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      },
    });
  }),

  http.get(`${API_BASE}/api/v1/hr/leave/balance`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        { leave_type: 'Annual', entitled: 20, used: 5, pending: 2, available: 13 },
        { leave_type: 'Sick', entitled: 10, used: 1, pending: 0, available: 9 },
      ],
    });
  }),

  // Attendance handlers
  http.get(`${API_BASE}/api/v1/hr/attendance`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      },
    });
  }),

  // Notification handlers
  http.get(`${API_BASE}/api/v1/notifications`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [],
        total: 0,
        unread_count: 0,
      },
    });
  }),
];
