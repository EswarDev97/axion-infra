/**
 * MindFlow - Complaint Service Types
 * Per API_CONTRACT.md Section 8.7 (Complaint Module)
 * ALIGNED WITH BACKEND SCHEMAS
 */

// ============================================================================
// Enums
// ============================================================================

export type ComplaintSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplaintStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_INFO'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED';

export type ComplaintSourceChannel =
  | 'MAIL'
  | 'PHONE'
  | 'INTERNAL'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'WALK_IN'
  | 'OTHER';

export type ComplaintActionType =
  | 'CREATED'
  | 'ASSIGNED'
  | 'REASSIGNED'
  | 'STATUS_CHANGE'
  | 'ESCALATED'
  | 'COMMENT'
  | 'RESOLUTION'
  | 'CLOSURE'
  | 'REOPENED';

export type AttachmentType =
  | 'GENERAL'
  | 'EVIDENCE'
  | 'RESOLUTION'
  | 'CORRESPONDENCE';

export type ComplaintantType =
  | 'INTERNAL'
  | 'EXTERNAL'
  | 'INSURER'
  | 'CLIENT'
  | 'VENDOR';

export type DisplayStatus = 'Open' | 'Working' | 'Closed';

// ============================================================================
// Common Types
// ============================================================================

export interface UserInfo {
  id: string;
  name: string;
}

export interface AssignableUser {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  department: string | null;
  designation: string;
}

// ============================================================================
// Complaint Category
// ============================================================================

export interface ComplaintCategory {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  parentCategoryId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: ComplaintCategory | null;
}

export interface ComplaintCategoryCreateRequest {
  name: string;
  code: string;
  description?: string;
  parentCategoryId?: string;
  isActive?: boolean;
}

export interface ComplaintCategoryUpdateRequest {
  name?: string;
  code?: string;
  description?: string | null;
  parentCategoryId?: string | null;
  isActive?: boolean;
}

// ============================================================================
// SLA Configuration
// ============================================================================

export interface SLAConfiguration {
  id: string;
  categoryId?: string | null;
  category?: ComplaintCategory | null;
  severity: ComplaintSeverity;
  responseTimeHours: number;
  resolutionTimeHours: number;
  escalationTimeHours: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLAConfigurationCreateRequest {
  categoryId?: string;
  severity: ComplaintSeverity;
  responseTimeHours: number;
  resolutionTimeHours: number;
  escalationTimeHours: number;
  isActive?: boolean;
}

export interface SLAConfigurationUpdateRequest {
  categoryId?: string | null;
  severity?: ComplaintSeverity;
  responseTimeHours?: number;
  resolutionTimeHours?: number;
  escalationTimeHours?: number;
  isActive?: boolean;
}

// ============================================================================
// Escalation Rule
// ============================================================================

export interface EscalationRule {
  id: string;
  categoryId?: string | null;
  category?: ComplaintCategory | null;
  escalationLevel: number;
  timeThresholdHours: number;
  escalateToPositionId?: string | null;
  escalateToRole?: string | null;
  notificationTemplate?: string | null;
  notifyDepartmentHead: boolean;
  notifyHrAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationRuleCreateRequest {
  categoryId?: string;
  escalationLevel: number;
  timeThresholdHours: number;
  escalateToPositionId?: string;
  escalateToRole?: string;
  notificationTemplate?: string;
  notifyDepartmentHead?: boolean;
  notifyHrAdmin?: boolean;
  isActive?: boolean;
}

export interface EscalationRuleUpdateRequest {
  categoryId?: string | null;
  escalationLevel?: number;
  timeThresholdHours?: number;
  escalateToPositionId?: string | null;
  escalateToRole?: string | null;
  notificationTemplate?: string | null;
  notifyDepartmentHead?: boolean;
  notifyHrAdmin?: boolean;
  isActive?: boolean;
}

// ============================================================================
// SLA Info (embedded in complaint response)
// ============================================================================

export interface SLAInfo {
  responseHours: number;
  resolutionHours: number;
  escalationHours: number;
  responseDueAt?: string | null;
  resolutionDueAt?: string | null;
}

// ============================================================================
// Complaint
// ============================================================================

export interface Complaint {
  id: string;
  complaintNumber: string;
  title: string;
  description?: string;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  sourceChannel: ComplaintSourceChannel;
  status: ComplaintStatus;
  displayStatus: DisplayStatus;
  complainantType?: ComplaintantType | null;
  complainantName?: string | null;
  complainantContact?: string | null;
  complainantEmployeeId?: string | null;
  ownerEmployeeId?: string | null;
  assignedToName?: string | null;
  assignedAt?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  insurerClient?: string | null;
  vehicleNumber?: string | null;
  workshopName?: string | null;
  correctiveAction?: string | null;
  expectedClosureDate?: string | null;
  sla?: SLAInfo | null;
  slaResponseDueAt?: string | null;
  slaResolutionDueAt?: string | null;
  respondedAt?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  closureRemarks?: string | null;
  closureTatHours?: number | null;
  closureTatDays?: number | null;
  reasonForComplaint?: string | null;
  complaintType?: string | null;
  reopenedCount: number;
  escalatedYN?: string;
  isEscalated: boolean;
  escalationLevel: number;
  lastEscalatedAt?: string | null;
  isOverdueResponse: boolean;
  isOverdueResolution: boolean;
  createdBy?: UserInfo | null;
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintCreateRequest {
  // Field order: Channel, Category, ComplaintType, ComplainantName, ContactNumber,
  // InsurerClient, ClaimNo, VehicleNumber, WorkshopName, Description, Severity, AssignTo
  sourceChannel: ComplaintSourceChannel;
  categoryId: string;
  complaintType?: string;
  complainantName?: string;
  complainantContact?: string;
  insurerClient?: string;
  claimNo?: string; // maps to referenceId
  vehicleNumber?: string;
  workshopName?: string;
  description: string;
  severity?: ComplaintSeverity;
  assignTo?: string; // maps to ownerEmployeeId
  // Legacy fields for backward compatibility
  title?: string;
  complainantType?: ComplaintantType;
  complainantEmployeeId?: string;
  referenceType?: string;
  correctiveAction?: string;
  expectedClosureDate?: string;
}

export interface ComplaintUpdateRequest {
  title?: string;
  description?: string;
  categoryId?: string;
  severity?: ComplaintSeverity;
  status?: ComplaintStatus;
  complaintType?: string | null;
  complainantType?: ComplaintantType | null;
  complainantName?: string | null;
  complainantContact?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  insurerClient?: string | null;
  vehicleNumber?: string | null;
  workshopName?: string | null;
  correctiveAction?: string | null;
  // Working stage fields
  expectedClosureDate?: string | null;
  closureRemarks?: string | null; // Action Taken / Remarks
}

export interface ComplaintAssignRequest {
  ownerEmployeeId: string;
  notes?: string;
}

export interface ComplaintEscalateRequest {
  escalateToEmployeeId?: string;
  reason: string;
}

export interface ComplaintResolveRequest {
  resolutionNotes: string;
}

export interface ComplaintCloseRequest {
  reasonForComplaint: string;
  correctiveAction: string;
  closureRemarks?: string;
}

export interface ComplaintReopenRequest {
  reason: string;
}

export interface ComplaintFilters {
  categoryId?: string;
  severity?: ComplaintSeverity;
  status?: ComplaintStatus;
  sourceChannel?: ComplaintSourceChannel;
  ownerEmployeeId?: string;
  complainantEmployeeId?: string;
  overdue?: boolean;
  search?: string;
}

// ============================================================================
// Complaint Action (History/Comments)
// ============================================================================

export interface ComplaintAction {
  id: string;
  complaintId: string;
  actionType: ComplaintActionType;
  description: string;
  oldStatus?: ComplaintStatus | null;
  newStatus?: ComplaintStatus | null;
  oldOwnerId?: string | null;
  newOwnerId?: string | null;
  fieldChanged?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  isInternal: boolean;
  performedAt: string;
  performedBy?: UserInfo | null;
  createdAt: string;
}

export interface ComplaintActionCreateRequest {
  actionType?: ComplaintActionType;
  description: string;
  isInternal?: boolean;
}

// ============================================================================
// Complaint Attachment
// ============================================================================

export interface ComplaintAttachment {
  id: string;
  complaintId: string;
  fileId: string;
  attachmentType: AttachmentType;
  uploadedAt: string;
  uploadedBy?: UserInfo | null;
}

export interface ComplaintAttachmentCreateRequest {
  fileId: string;
  attachmentType?: AttachmentType;
}

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface ComplaintDashboardStats {
  totalComplaints: number;
  openComplaints: number;
  assignedComplaints: number;
  inProgressComplaints: number;
  resolvedToday: number;
  closedToday: number;
  overdueResponse: number;
  overdueResolution: number;
  averageResolutionHours: number | null;
  byStatus: Record<ComplaintStatus, number>;
  bySeverity: Record<ComplaintSeverity, number>;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  // Scoped counts (role-filtered, simplified status groups)
  openCount?: number;
  workingCount?: number;
  overdueCount?: number;
  resolvedTodayCount?: number;
}

// ============================================================================
// Report Types
// ============================================================================

export interface DepartmentReport {
  departmentName: string;
  departmentId: string;
  total: number;
  resolved: number;
  overdue: number;
  avgTatHours: number | null;
}

export interface SeverityReport {
  severity: ComplaintSeverity;
  total: number;
  resolved: number;
  escalated: number;
  avgTatHours: number | null;
}

export interface EscalationReportItem {
  complaintNumber: string;
  title: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  escalationLevel: number;
  lastEscalatedAt: string | null;
  overdueDays: number;
  ownerEmployeeId: string | null;
  createdAt: string;
}

export interface MonthlySummary {
  period: { from: string; to: string };
  totalReceived: number;
  totalResolved: number;
  totalPending: number;
  avgClosureTatHours: number | null;
  escalationRate: number;
  escalatedCount: number;
}

export interface DailyReportItem {
  complaintNumber: string;
  title: string;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  displayStatus: DisplayStatus;
  ownerEmployeeId: string | null;
  categoryName: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyComplaintsSummary {
  totalSubmitted: number;
  pending: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

// ============================================================================
// SLA Compliance Report
// ============================================================================

export interface SLAComplianceReport {
  category: string;
  severity: ComplaintSeverity;
  total: number;
  withinSla: number;
  slaBreached: number;
  slaCompliancePct: number;
}

export interface ComplaintTrendReport {
  month: string;
  totalComplaints: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  avgResolutionHours: number | null;
}

export interface AgingReport {
  ageGroup: string;
  count: number;
  percentage: number;
}
