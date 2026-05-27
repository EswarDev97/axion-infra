/**
 * MindFlow - Micro CRM TypeScript types
 */

export type DiscussionSummary =
  | 'INTRODUCE_AXION'
  | 'ESTABLISH_CREDIBILITY'
  | 'RO_APPROVAL_CIRCULATED'
  | 'EXPLAIN_EASY_PROCESS'
  | 'UNDERSTAND_PAIN_POINTS'
  | 'OFFER_TRAINING_DEMO'
  | 'OBTAIN_FIRST_CASE';

export type InterestLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export const DISCUSSION_SUMMARY_LABELS: Record<DiscussionSummary, string> = {
  INTRODUCE_AXION: 'Introduce Axion',
  ESTABLISH_CREDIBILITY: 'Establish Credibility',
  RO_APPROVAL_CIRCULATED: 'Explain that RO has already circulated approval',
  EXPLAIN_EASY_PROCESS: 'Explain how easy the process is',
  UNDERSTAND_PAIN_POINTS: 'Understand Branch Pain Points',
  OFFER_TRAINING_DEMO: 'Offer Training / Demo',
  OBTAIN_FIRST_CASE: 'Obtain First Live Case',
};

export const INTEREST_LEVEL_LABELS: Record<InterestLevel, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export interface ContactPerson {
  id: string;
  leadId: string;
  name: string;
  designation: string;
  mobile: string;
  email: string;
  createdAt: string;
}

export interface ContactPersonInput {
  name: string;
  designation: string;
  mobile: string;
  email: string;
}

export interface CrmLead {
  id: string;
  tenantId: string;
  operatingOfficeName: string;
  location: string;
  contacts: ContactPerson[];
  dateContacted: string;
  discussionSummary: DiscussionSummary;
  interestLevel: InterestLevel;
  demoRequired: boolean;
  trainingCompleted: boolean;
  nextFollowupDate: string | null;
  remarks: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CrmLeadCreateRequest {
  operatingOfficeName: string;
  location: string;
  contacts: ContactPersonInput[];
  dateContacted: string;
  discussionSummary: DiscussionSummary;
  interestLevel: InterestLevel;
  demoRequired: boolean;
  trainingCompleted: boolean;
  nextFollowupDate?: string | null;
  remarks?: string | null;
}

export interface CrmLeadUpdateRequest {
  operatingOfficeName?: string;
  location?: string;
  contacts?: ContactPersonInput[];
  dateContacted?: string;
  discussionSummary?: DiscussionSummary;
  interestLevel?: InterestLevel;
  demoRequired?: boolean;
  trainingCompleted?: boolean;
  nextFollowupDate?: string | null;
  remarks?: string | null;
}

export interface CrmLeadListResponse {
  items: CrmLead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface CrmLeadFilters {
  search?: string;
  interestLevel?: InterestLevel;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
}
