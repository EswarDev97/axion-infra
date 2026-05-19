/**
 * MindFlow - HR Service Types
 * Per API_CONTRACT.md Section 8.2 (HR Module)
 */

// ============================================================================
// Department
// ============================================================================

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  employeeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentCreateRequest {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  managerId?: string;
}

export interface DepartmentUpdateRequest {
  name?: string;
  description?: string | null;
  parentId?: string | null;
  managerId?: string | null;
  isActive?: boolean;
}

// ============================================================================
// Position
// ============================================================================

export interface Position {
  id: string;
  tenantId: string;
  title: string;
  code: string;
  description?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  level: number;
  employeeCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PositionCreateRequest {
  title: string;
  code: string;
  description?: string;
  departmentId?: string;
  level?: number;
}

export interface PositionUpdateRequest {
  title?: string;
  description?: string | null;
  departmentId?: string | null;
  level?: number;
  isActive?: boolean;
}

// ============================================================================
// Employee
// ============================================================================

export type EmploymentStatus = 'ACTIVE' | 'PROBATION' | 'ON_LEAVE' | 'TERMINATED' | 'RESIGNED' | 'RETIRED';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN' | 'CONSULTANT';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type MaritalStatus = 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED' | 'OTHER';

export interface Employee {
  id: string;
  tenantId: string;
  userId?: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  positionId: string;
  positionTitle: string;
  managerId?: string | null;
  managerName?: string | null;
  dateOfJoining: string;
  dateOfExit?: string | null;
  status: string;
  employmentType: string;
  salary?: number | null;
  role?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveBalanceInput {
  leaveTypeCode: string;
  days: number;
}

export interface EmployeeCreateRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  role?: string;
  positionId: string;
  departmentId?: string;
  managerId?: string;
  dateOfJoining: string;
  employmentType?: string;
  salary?: number;
  userId?: string;
  leaveBalances?: LeaveBalanceInput[];
}

export interface EmployeeUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  password?: string;
  leaveBalances?: LeaveBalanceInput[];
  positionId?: string | null;
  departmentId?: string | null;
  managerId?: string | null;
  status?: string;
  employmentType?: string;
  salary?: number | null;
  dateOfExit?: string | null;
}

export interface EmployeeFilters {
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  status?: string;
  employmentType?: string;
  search?: string;
}

// ============================================================================
// Leave
// ============================================================================

export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface LeaveType {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string | null;
  defaultDays: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
  isPaid: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveTypeCreateRequest {
  name: string;
  code: string;
  description?: string;
  defaultDays?: number;
  carryForward?: boolean;
  maxCarryForwardDays?: number;
  isPaid?: boolean;
  isActive?: boolean;
}

export interface LeaveTypeUpdateRequest {
  name?: string;
  code?: string;
  description?: string | null;
  defaultDays?: number;
  carryForward?: boolean;
  maxCarryForwardDays?: number;
  isPaid?: boolean;
  isActive?: boolean;
}

export interface LeaveBalance {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  year: number;
  totalDays: number;
  usedDays: number;
  pendingDays: number;
  availableDays: number;
  carriedOverDays: number;
}

export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string | null;
  status: LeaveRequestStatus;
  approverId?: string | null;
  approverName?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestCreateRequest {
  employeeId?: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

export interface LeaveApprovalRequest {
  status: 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
}

// ============================================================================
// Attendance
// ============================================================================

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'WEEKLY_OFF' | 'WORK_FROM_HOME';

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn?: string | null;
  checkOut?: string | null;
  workHours?: number | null;
  overtimeHours?: number | null;
  status: AttendanceStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceCheckInRequest {
  employeeId?: string;
  notes?: string;
}

export interface AttendanceCheckOutRequest {
  employeeId?: string;
  notes?: string;
}

export interface AttendanceBulkImportItem {
  employeeCode: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status?: AttendanceStatus;
  notes?: string;
}

export interface AttendanceBulkImportRequest {
  records: AttendanceBulkImportItem[];
}

export interface AttendanceBulkImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  leaveDays: number;
  halfDays: number;
  totalWorkHours: number;
  averageWorkHours: number;
}

export interface AttendanceReportResponse {
  startDate: string;
  endDate: string;
  totalEmployees: number;
  summary: EmployeeAttendanceSummary[];
}

export interface AttendanceCorrectionRequest {
  checkIn?: string;
  checkOut?: string;
  status?: string;
  notes?: string;
}

export interface TeamTodayStatus {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  departmentName?: string | null;
  status?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  workHours?: number | null;
}

export interface DashboardAttendanceStats {
  totalEmployees: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  onLeaveToday: number;
  attendancePercentage: number;
}

// ============================================================================
// Holidays
// ============================================================================

export type HolidayType = 'PUBLIC' | 'COMPANY' | 'OPTIONAL';

export interface Holiday {
  id: string;
  tenantId: string;
  holidayName: string;
  holidayDate: string;
  holidayType: HolidayType;
  isRecurring: boolean;
  description?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HolidayCreateRequest {
  holidayName: string;
  holidayDate: string;
  holidayType: HolidayType;
  isRecurring: boolean;
  description?: string;
}

export interface HolidayUpdateRequest {
  holidayName?: string;
  holidayDate?: string;
  holidayType?: HolidayType;
  isRecurring?: boolean;
  description?: string;
}

export interface WeeklyOffDay {
  id: string;
  dayOfWeek: number;
  dayName: string;
}

export interface WeeklyOffConfig {
  days: WeeklyOffDay[];
}

// ============================================================================
// Payroll
// ============================================================================

export type PayrollStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAID';

export interface PayrollRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  status: PayrollStatus;
  paymentDate?: string | null;
  bankAccountMasked?: string | null;
  taxInfoMasked?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollCreateRequest {
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  allowances?: number;
  deductions?: number;
  bankAccount?: string;
  taxInfo?: string;
  notes?: string;
}

export interface PayrollUpdateRequest {
  baseSalary?: number;
  allowances?: number;
  deductions?: number;
  status?: PayrollStatus;
  paymentDate?: string;
  bankAccount?: string;
  taxInfo?: string;
  notes?: string;
}

// ============================================================================
// Candidate (Recruitment)
// ============================================================================

export type CandidateStatus = 'NEW' | 'SCREENING' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED';

export interface Candidate {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  currentCompany?: string | null;
  currentPosition?: string | null;
  expectedSalary?: number | null;
  noticePeriodDays?: number | null;
  resumeFileId?: string | null;
  resumeFileName?: string | null;
  positionId?: string | null;
  positionName?: string | null;
  status: CandidateStatus;
  source?: string | null;
  notes?: string | null;
  rating?: number | null;
  interviewDate?: string | null;
  interviewNotes?: string | null;
  offerAmount?: number | null;
  offerDate?: string | null;
  convertedEmployeeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CandidateCreateRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  currentCompany?: string;
  currentPosition?: string;
  expectedSalary?: number;
  noticePeriodDays?: number;
  positionId?: string;
  source?: string;
  notes?: string;
}

export interface CandidateUpdateRequest {
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  currentCompany?: string | null;
  currentPosition?: string | null;
  expectedSalary?: number | null;
  noticePeriodDays?: number | null;
  positionId?: string | null;
  status?: CandidateStatus;
  source?: string | null;
  notes?: string | null;
  rating?: number | null;
  interviewDate?: string | null;
  interviewNotes?: string | null;
  offerAmount?: number | null;
  offerDate?: string | null;
}

export interface CandidateConvertRequest {
  employeeCode: string;
  departmentId?: string;
  positionId?: string;
  managerId?: string;
  dateOfJoining: string;
  employmentType?: string;
}
