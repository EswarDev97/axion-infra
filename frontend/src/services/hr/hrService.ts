/**
 * MindFlow - HR Service
 * Per API_CONTRACT.md Section 8.2 (HR Module)
 */

import { get, post, put, patch, del, apiClient } from '@/services/api/client';
import { getList } from '@/services/api/helpers';
import type { PaginatedResponse, PaginationParams } from '@/services/api/types';
import type {
  Department,
  DepartmentCreateRequest,
  DepartmentUpdateRequest,
  Position,
  PositionCreateRequest,
  PositionUpdateRequest,
  Employee,
  EmployeeCreateRequest,
  EmployeeUpdateRequest,
  EmployeeFilters,
  LeaveType,
  LeaveTypeCreateRequest,
  LeaveTypeUpdateRequest,
  LeaveBalance,
  LeaveRequest,
  LeaveRequestCreateRequest,
  LeaveApprovalRequest,
  AttendanceRecord,
  AttendanceCheckInRequest,
  AttendanceCheckOutRequest,
  AttendanceBulkImportRequest,
  AttendanceBulkImportResult,
  AttendanceReportResponse,
  AttendanceCorrectionRequest,
  TeamTodayStatus,
  DashboardAttendanceStats,
  Holiday,
  HolidayCreateRequest,
  HolidayUpdateRequest,
  WeeklyOffConfig,
  PayrollRecord,
  PayrollCreateRequest,
  PayrollUpdateRequest,
  Candidate,
  CandidateCreateRequest,
  CandidateUpdateRequest,
  CandidateConvertRequest,
} from './types';

// ============================================================================
// Department Service
// ============================================================================

export const departmentService = {
  async list(params?: PaginationParams): Promise<PaginatedResponse<Department>> {
    return get<PaginatedResponse<Department>>('/departments', params);
  },

  async getById(id: string): Promise<Department> {
    return get<Department>(`/departments/${id}`);
  },

  async create(data: DepartmentCreateRequest): Promise<Department> {
    return post<Department>('/departments', data);
  },

  async update(id: string, data: DepartmentUpdateRequest): Promise<Department> {
    return put<Department>(`/departments/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/departments/${id}`);
  },

  async getHierarchy(): Promise<Department[]> {
    return get<Department[]>('/departments/hierarchy');
  },
};

// ============================================================================
// Position Service
// ============================================================================

export const positionService = {
  async list(params?: PaginationParams & { departmentId?: string }): Promise<PaginatedResponse<Position>> {
    return get<PaginatedResponse<Position>>('/positions', params);
  },

  async getById(id: string): Promise<Position> {
    return get<Position>(`/positions/${id}`);
  },

  async create(data: PositionCreateRequest): Promise<Position> {
    return post<Position>('/positions', data);
  },

  async update(id: string, data: PositionUpdateRequest): Promise<Position> {
    return put<Position>(`/positions/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/positions/${id}`);
  },
};

// ============================================================================
// Employee Service
// ============================================================================

export const employeeService = {
  async list(params?: PaginationParams & EmployeeFilters): Promise<PaginatedResponse<Employee>> {
    return get<PaginatedResponse<Employee>>('/employees', params);
  },

  async getById(id: string): Promise<Employee> {
    return get<Employee>(`/employees/${id}`);
  },

  /**
   * The caller's own employee record, gated on employees:read:self rather
   * than the directory-wide hr:read:all/hr:read:subordinates permissions
   * that GET /employees and GET /employees/{id} require. Used by
   * self-service-only roles (e.g. EMPLOYEE with payments:read:own) that
   * can't call employeeService.list() to resolve a display name.
   */
  async getMe(): Promise<Employee> {
    return get<Employee>('/employees/me');
  },

  /**
   * Every active employee with position 'Field Executive', gated on
   * payments:create/payments:read rather than the directory-wide
   * hr:read:all/hr:read:subordinates. Lets a payments-only role (e.g.
   * EMPLOYEE) populate the Payment Management form's Executive dropdown
   * with all Field Executives — not just their own record via getMe() —
   * without gaining general employee-directory read access.
   */
  async fieldExecutives(): Promise<Employee[]> {
    const res = await get<PaginatedResponse<Employee>>('/employees/field-executives');
    return res.items ?? [];
  },

  async create(data: EmployeeCreateRequest): Promise<Employee> {
    return post<Employee>('/employees', data);
  },

  async update(id: string, data: EmployeeUpdateRequest): Promise<Employee> {
    return put<Employee>(`/employees/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/employees/${id}`);
  },

  async changePassword(id: string, password: string): Promise<void> {
    return put<void>(`/employees/${id}/change-password`, { password });
  },

  async updateStatus(id: string, status: string): Promise<Employee> {
    return put<Employee>(`/employees/${id}/status`, { status });
  },

  async getSubordinates(managerId: string): Promise<Employee[]> {
    return get<Employee[]>(`/employees/${managerId}/subordinates`);
  },

  async getHierarchy(employeeId: string): Promise<Employee[]> {
    return get<Employee[]>(`/employees/${employeeId}/hierarchy`);
  },

  async getCurrentEmployee(): Promise<Employee> {
    return get<Employee>('/employees/me');
  },
};

// ============================================================================
// Leave Type Service
// ============================================================================

export const leaveTypeService = {
  async list(params?: PaginationParams): Promise<PaginatedResponse<LeaveType>> {
    return get<PaginatedResponse<LeaveType>>('/leave/types', params);
  },

  async getById(id: string): Promise<LeaveType> {
    return get<LeaveType>(`/leave/types/${id}`);
  },

  async create(data: LeaveTypeCreateRequest): Promise<LeaveType> {
    return post<LeaveType>('/leave/types', data);
  },

  async update(id: string, data: LeaveTypeUpdateRequest): Promise<LeaveType> {
    return put<LeaveType>(`/leave/types/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/leave/types/${id}`);
  },
};

// ============================================================================
// Leave Balance Service
// ============================================================================

export const leaveBalanceService = {
  async list(params?: { employeeId?: string; year?: number }): Promise<LeaveBalance[]> {
    return getList<LeaveBalance>('/leave/balances', params);
  },

  async getByEmployee(employeeId: string, year?: number): Promise<LeaveBalance[]> {
    return get<LeaveBalance[]>(`/leave/balances/${employeeId}`, { year });
  },

  async getCurrentUserBalances(year?: number): Promise<LeaveBalance[]> {
    return get<LeaveBalance[]>('/leave/balances', { year });
  },

  async adjust(
    employeeId: string,
    leaveTypeId: string,
    adjustment: { days: number; reason: string }
  ): Promise<LeaveBalance> {
    return post<LeaveBalance>(
      `/leave/balances/${employeeId}/${leaveTypeId}/adjust`,
      adjustment
    );
  },
};

// ============================================================================
// Leave Request Service
// ============================================================================

export const leaveRequestService = {
  async list(params?: PaginationParams & { employeeId?: string; status?: string }): Promise<PaginatedResponse<LeaveRequest>> {
    return get<PaginatedResponse<LeaveRequest>>('/leave/requests', params);
  },

  async getById(id: string): Promise<LeaveRequest> {
    return get<LeaveRequest>(`/leave/requests/${id}`);
  },

  async create(data: LeaveRequestCreateRequest): Promise<LeaveRequest> {
    return post<LeaveRequest>('/leave/requests', data);
  },

  async cancel(id: string): Promise<LeaveRequest> {
    return patch<LeaveRequest>(`/leave/requests/${id}/cancel`, {});
  },

  async approve(id: string, data: LeaveApprovalRequest): Promise<LeaveRequest> {
    return patch<LeaveRequest>(`/leave/requests/${id}/approve`, data);
  },

  async getPending(): Promise<LeaveRequest[]> {
    return get<LeaveRequest[]>('/leave/requests/pending');
  },

  async getMyRequests(): Promise<LeaveRequest[]> {
    return get<LeaveRequest[]>('/leave/requests/me');
  },
};

// ============================================================================
// Attendance Service
// ============================================================================

export const attendanceService = {
  async list(params?: PaginationParams & {
    employeeId?: string;
    departmentId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<PaginatedResponse<AttendanceRecord>> {
    return get<PaginatedResponse<AttendanceRecord>>('/attendance', params);
  },

  async listTeam(params?: PaginationParams & {
    employeeId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }): Promise<PaginatedResponse<AttendanceRecord>> {
    return get<PaginatedResponse<AttendanceRecord>>('/attendance/team', params);
  },

  async checkIn(data?: AttendanceCheckInRequest): Promise<AttendanceRecord> {
    return post<AttendanceRecord>('/attendance/check-in', data || {});
  },

  async checkOut(data?: AttendanceCheckOutRequest): Promise<AttendanceRecord> {
    return post<AttendanceRecord>('/attendance/check-out', data || {});
  },

  async bulkImport(data: AttendanceBulkImportRequest): Promise<AttendanceBulkImportResult> {
    return post<AttendanceBulkImportResult>('/attendance/bulk-import', data);
  },

  async getReport(params: {
    startDate: string;
    endDate: string;
    departmentId?: string;
    employeeId?: string;
  }): Promise<AttendanceReportResponse> {
    return get<AttendanceReportResponse>('/attendance/report', params);
  },

  async getMyAttendance(params?: { startDate?: string; endDate?: string }): Promise<AttendanceRecord[]> {
    return get<AttendanceRecord[]>('/attendance/me', params);
  },

  async getTodayStatus(): Promise<AttendanceRecord | null> {
    return get<AttendanceRecord | null>('/attendance/me/today');
  },

  async markAbsent(targetDate: string): Promise<{ marked: number }> {
    return post<{ marked: number }>('/attendance/mark-absent', { targetDate });
  },

  async correctRecord(id: string, data: AttendanceCorrectionRequest): Promise<AttendanceRecord> {
    return put<AttendanceRecord>(`/attendance/${id}`, data);
  },

  async getTeamTodayStatus(): Promise<TeamTodayStatus[]> {
    return get<TeamTodayStatus[]>('/attendance/team/today');
  },

  async getDashboardStats(): Promise<DashboardAttendanceStats> {
    return get<DashboardAttendanceStats>('/attendance/dashboard-stats');
  },

  async exportCsv(params: {
    startDate: string;
    endDate: string;
    departmentId?: string;
    employeeId?: string;
  }): Promise<Blob> {
    const queryParams = new URLSearchParams();
    queryParams.set('startDate', params.startDate);
    queryParams.set('endDate', params.endDate);
    if (params.departmentId) queryParams.set('departmentId', params.departmentId);
    if (params.employeeId) queryParams.set('employeeId', params.employeeId);

    const response = await apiClient.get(`/attendance/export/csv?${queryParams.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ============================================================================
// Holiday Service
// ============================================================================

export const holidayService = {
  async list(params?: PaginationParams & {
    year?: number;
    holidayType?: string;
  }): Promise<PaginatedResponse<Holiday>> {
    return get<PaginatedResponse<Holiday>>('/holidays', params);
  },

  async getById(id: string): Promise<Holiday> {
    return get<Holiday>(`/holidays/${id}`);
  },

  async create(data: HolidayCreateRequest): Promise<Holiday> {
    return post<Holiday>('/holidays', data);
  },

  async update(id: string, data: HolidayUpdateRequest): Promise<Holiday> {
    return put<Holiday>(`/holidays/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/holidays/${id}`);
  },

  async getWeeklyOff(): Promise<WeeklyOffConfig> {
    return get<WeeklyOffConfig>('/holidays/weekly-off');
  },

  async updateWeeklyOff(daysOfWeek: number[]): Promise<WeeklyOffConfig> {
    return put<WeeklyOffConfig>('/holidays/weekly-off', { daysOfWeek });
  },
};

// ============================================================================
// Payroll Service
// ============================================================================

export const payrollService = {
  async list(params?: PaginationParams & {
    employeeId?: string;
    month?: number;
    year?: number;
    status?: string;
  }): Promise<PaginatedResponse<PayrollRecord>> {
    return get<PaginatedResponse<PayrollRecord>>('/payroll', params);
  },

  async getById(id: string): Promise<PayrollRecord> {
    return get<PayrollRecord>(`/payroll/${id}`);
  },

  async create(data: PayrollCreateRequest): Promise<PayrollRecord> {
    return post<PayrollRecord>('/payroll', data);
  },

  async update(id: string, data: PayrollUpdateRequest): Promise<PayrollRecord> {
    return put<PayrollRecord>(`/payroll/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/payroll/${id}`);
  },

  async generateMonthly(params: { month: number; year: number; departmentId?: string }): Promise<PayrollRecord[]> {
    return post<PayrollRecord[]>('/payroll/generate', params);
  },

  async bulkApprove(ids: string[]): Promise<PayrollRecord[]> {
    return post<PayrollRecord[]>('/payroll/bulk-approve', { ids });
  },

  async bulkPay(ids: string[]): Promise<PayrollRecord[]> {
    return post<PayrollRecord[]>('/payroll/bulk-pay', { ids });
  },

  async getMyPayslips(year?: number): Promise<PayrollRecord[]> {
    return get<PayrollRecord[]>('/payroll/me', { year });
  },
};

// ============================================================================
// Candidate Service
// ============================================================================

export const candidateService = {
  async list(params?: PaginationParams & {
    status?: string;
    positionId?: string;
    search?: string;
  }): Promise<PaginatedResponse<Candidate>> {
    return get<PaginatedResponse<Candidate>>('/candidates', params);
  },

  async getById(id: string): Promise<Candidate> {
    return get<Candidate>(`/candidates/${id}`);
  },

  async create(data: CandidateCreateRequest): Promise<Candidate> {
    return post<Candidate>('/candidates', data);
  },

  async update(id: string, data: CandidateUpdateRequest): Promise<Candidate> {
    return put<Candidate>(`/candidates/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return del<void>(`/candidates/${id}`);
  },

  async uploadResume(id: string, file: File): Promise<{ fileId: string; fileName: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return post<{ fileId: string; fileName: string }>(`/candidates/${id}/resume`, formData);
  },

  async convert(id: string, data: CandidateConvertRequest): Promise<Employee> {
    return post<Employee>(`/candidates/${id}/convert`, data);
  },
};

// ============================================================================
// Combined HR Service Export
// ============================================================================

export const hrService = {
  departments: departmentService,
  positions: positionService,
  employees: employeeService,
  leaveTypes: leaveTypeService,
  leaveBalances: leaveBalanceService,
  leaveRequests: leaveRequestService,
  attendance: attendanceService,
  payroll: payrollService,
  candidates: candidateService,
};

export default hrService;
