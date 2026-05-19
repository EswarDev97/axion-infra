/**
 * MindFlow - Employees API
 * Server-side API functions for employee data
 * Based on backend EmployeeResponse schema
 */

import { serverFetch, serverFetchList } from './server-fetch';

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string;
  positionId: string;
  positionTitle: string;
  departmentId?: string;
  departmentName?: string;
  managerId?: string;
  managerName?: string;
  dateOfJoining: string;
  dateOfExit?: string;
  status: string;
  employmentType: string;
  userId?: string;
  tenantId: string;
  avatar?: string;
}

export async function getEmployee(id: string): Promise<Employee | null> {
  return serverFetch<Employee>(`/employees/${id}`);
}

export async function getEmployees(): Promise<Employee[]> {
  return serverFetchList<Employee>('/employees');
}
