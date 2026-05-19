# MindFlow – UI/UX Design Document

> **Purpose**: Define all user interfaces, user flows, and frontend architecture for MindFlow Phase 1
> **SDLC Phase**: Phase 1.5 – UI/UX Design & Frontend Planning
> **Tasks Covered**: 1.5.1 through 1.5.14
> **Status**: DRAFT - Pending Product Owner Approval
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 1.5 – UI/UX Design & Frontend Planning |
| **SDLC Tasks** | 1.5.1, 1.5.2, 1.5.3, 1.5.4, 1.5.5, 1.5.6, 1.5.7, 1.5.8, 1.5.9, 1.5.10, 1.5.11, 1.5.12, 1.5.13, 1.5.14 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [ARCHITECTURE_DESIGN.md](ARCHITECTURE_DESIGN.md), [TECH_STACK.md](TECH_STACK.md) |
| **Approval Status** | DRAFT - Pending Product Owner Approval |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Screen Inventory (Task 1.5.1)](#2-screen-inventory-task-151)
3. [User Flow Wireframes (Task 1.5.2)](#3-user-flow-wireframes-task-152)
4. [Component Hierarchy (Task 1.5.3)](#4-component-hierarchy-task-153)
5. [Design System (Task 1.5.4)](#5-design-system-task-154)
6. [Responsive Design (Task 1.5.5)](#6-responsive-design-task-155)
7. [Accessibility Requirements (Task 1.5.6)](#7-accessibility-requirements-task-156)
8. [State Management Strategy (Task 1.5.7)](#8-state-management-strategy-task-157)
9. [Routing & Navigation (Task 1.5.8)](#9-routing--navigation-task-158)
10. [Form Validation & Error Display (Task 1.5.9)](#10-form-validation--error-display-task-159)
11. [Loading & Empty States (Task 1.5.10)](#11-loading--empty-states-task-1510)
12. [Notification Patterns (Task 1.5.11)](#12-notification-patterns-task-1511)
13. [PRD Requirements Review (Task 1.5.12)](#13-prd-requirements-review-task-1512)
14. [Stakeholder Sign-Off (Task 1.5.13)](#14-stakeholder-sign-off-task-1513)
15. [Dependencies](#15-dependencies)
16. [Approval Record](#16-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the comprehensive UI/UX design specifications for MindFlow Phase 1, defining:
- All screens and views per module
- User flow wireframes for critical journeys
- Reusable component hierarchy
- Design system (colors, typography, spacing)
- Responsive design strategy
- Accessibility requirements (WCAG 2.1 Level AA)
- Frontend state management approach
- Routing and navigation patterns
- Form validation and error handling standards
- Loading, empty, and notification patterns

### 1.2 Design Principles

| Principle | Description |
|-----------|-------------|
| **Clarity First** | Every screen serves a clear purpose; no visual clutter |
| **Hierarchy-Driven** | UI reflects organizational hierarchy (managers see team data) |
| **Action-Oriented** | Primary actions prominent; workflows guide users to completion |
| **Consistent** | Same patterns across all modules for familiarity |
| **Accessible** | WCAG 2.1 Level AA compliance for all users |
| **Responsive** | Full functionality across desktop, tablet, mobile |

### 1.3 Technology Stack (from TECH_STACK.md)

| Technology | Purpose |
|------------|---------|
| Next.js 14.x | React framework with App Router |
| TypeScript 5.x | Type-safe JavaScript |
| Tailwind CSS | Utility-first CSS framework |
| Zustand | Client state management |
| TanStack React Query | Server state management |
| React Hook Form + Zod | Form handling and validation |
| Lucide React | Icon library |

### 1.4 User Personas

| Persona | Role | Primary Activities | Access Level |
|---------|------|-------------------|--------------|
| **Executive** | MD/National Head | View dashboards, approve high-value items, oversight | Full visibility |
| **Manager** | Regional Manager/Team Lead | Manage team tasks, approvals, view team data | Team + subordinates |
| **HR Admin** | HR Administrator | Employee management, hierarchy, leave processing | HR module full access |
| **Finance Admin** | Finance Administrator | Expense processing, payments, financial reports | Expense module full access |
| **Training Admin** | Training Administrator | Course management, session scheduling, certifications | Training module full access |
| **Employee** | Standard User | Own tasks, submit requests, view own data | Self-service access |

---

## 2. Screen Inventory (Task 1.5.1)

### 2.1 Authentication Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Login** | User authentication | All | Email, password | Login, Forgot Password |
| **Forgot Password** | Password reset request | All | Email | Request reset link |
| **Reset Password** | Set new password | All | New password | Submit new password |
| **Change Password** | Update password (logged in) | All | Current password, new password | Change password |
| **Active Sessions** | View/revoke sessions | All | Device, IP, last active | Revoke session |

---

### 2.2 Dashboard Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Main Dashboard** | Overview of key metrics | All | Task summary, pending approvals, notifications | Navigate to modules |
| **Manager Dashboard** | Team overview | Manager+ | Team tasks, pending approvals, team metrics | Drill down, approve |
| **HR Dashboard** | HR metrics | HR_ADMIN | Employee count, leave requests, attendance | Manage employees |
| **Finance Dashboard** | Financial metrics | FINANCE_ADMIN | Pending expenses, payment status | Process payments |
| **Training Dashboard** | Training metrics | TRAINING_ADMIN | Course enrollment, completion rates | Manage courses |

---

### 2.3 Mind Mapping Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Mind Map List** | View all mind maps | All | Mind map title, creator, date, status | Create, Open, Archive |
| **Mind Map Canvas** | Create/edit mind map | All | Nodes, connections, layout | Add node, Edit, Save |
| **Mind Map Templates** | Template gallery | All | Template name, preview | Select template |
| **Node Detail Panel** | Edit node properties | All | Node type, title, description, attachments | Save, Link to task |
| **Zen Mode** | Distraction-free editing | All | Canvas only | Toggle zen mode |

---

### 2.4 Task Management Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Task List View** | List all tasks | All | Task title, status, assignee, ECD, priority | Create, Filter, Sort |
| **Task Kanban Board** | Visual task workflow | All | Tasks by status columns | Drag-drop, Create |
| **Task Calendar View** | Calendar by ECD | All | Tasks on calendar dates | View, Create |
| **Task Detail View** | Full task information | All | All task attributes | Edit, Comment, Attach |
| **Task Create/Edit Form** | Task CRUD | All | Title, description, assignee, ECD, priority | Save, Cancel |
| **My Tasks** | User's assigned tasks | All | Own tasks only | Filter, Update status |
| **Team Tasks** | Subordinates' tasks | Manager+ | Team members' tasks | Assign, Review |
| **Sub-Tasks View** | Hierarchical sub-tasks | All | Parent task, sub-tasks | Add sub-task |

---

### 2.5 HR Management Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Employee Directory** | Search employees | All | Name, position, department, email | Search, View profile |
| **Employee Profile** | View employee details | HR_ADMIN, Manager (subordinates) | Full employee info | Edit (HR only) |
| **Employee Create/Edit** | Add/edit employee | HR_ADMIN | All employee fields | Save, Cancel |
| **Position Management** | Manage positions | HR_ADMIN | Position name, level, hierarchy | Create, Edit, Delete |
| **Org Hierarchy View** | Organizational chart | All (view), HR_ADMIN (edit) | Reporting relationships | View, Edit hierarchy |
| **Candidate List** | Interview tracking | HR_ADMIN | Candidate name, status, position | Update status, Convert |
| **Candidate Detail** | Candidate info | HR_ADMIN | Full candidate info | Edit, Convert to employee |
| **Attendance Dashboard** | Daily attendance | HR_ADMIN, Manager (team) | Present/absent status | Mark attendance |
| **Attendance Calendar** | Monthly attendance | All (own), Manager (team) | Calendar view | View history |
| **Leave Request List** | All leave requests | HR_ADMIN, Manager (team), Employee (own) | Leave type, dates, status | Filter, Approve |
| **Leave Request Form** | Apply for leave | All | Leave type, dates, reason | Submit |
| **Leave Balance** | View leave balance | All | Leave type, available days | View |
| **Payroll References** | Payroll data (read-only) | HR_ADMIN, Employee (own) | Salary components | View |

---

### 2.6 Training Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Course Catalog** | Browse courses | All | Course name, duration, mandatory flag | Enroll, View |
| **Course Detail** | Course information | All | Description, content, sessions | Enroll, Start |
| **My Training** | Enrolled courses | All | Progress, completion status | Continue, View certificate |
| **Course Create/Edit** | Manage courses | TRAINING_ADMIN | All course fields | Save, Publish |
| **Session Schedule** | Training calendar | All | Session date, trainer, location | View, Register |
| **Session Create/Edit** | Schedule sessions | TRAINING_ADMIN | Date, time, trainer, location | Save, Cancel |
| **Training Attendance** | Session attendance | TRAINING_ADMIN | Trainee list, present/absent | Mark attendance |
| **Exam Interface** | Take exam | All | Questions, timer, answers | Submit |
| **Exam Create/Edit** | Create exam | TRAINING_ADMIN | Questions, passing score, time limit | Save, Publish |
| **Question Bank** | Manage questions | TRAINING_ADMIN | Question list, type, difficulty | Create, Edit |
| **Exam Results** | View results | All (own), TRAINING_ADMIN (all) | Score, pass/fail, attempts | View details |
| **Certificate View** | View/download certificate | All | Certificate PDF | Download, Share |
| **Training Reports** | Completion metrics | TRAINING_ADMIN, Manager | Completion rates, scores | Export |

---

### 2.7 Expense Management Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Expense List** | View expense requests | FINANCE_ADMIN (all), Manager (team), Employee (own) | Amount, status, date | Filter, Create |
| **Expense Detail** | Full expense info | Roles above | All fields, receipts, approvals | Approve, Reject |
| **Expense Create/Edit** | Submit expense | All | Amount, type, description, receipts | Save, Submit |
| **Expense Item Entry** | Add line items | All | Item description, amount, category | Add, Remove |
| **Approval Queue** | Pending approvals | Manager, FINANCE_ADMIN | Pending expense requests | Approve, Reject |
| **Payment Processing** | Process payments | FINANCE_ADMIN | Approved expenses | Mark paid |
| **Expense Reports** | Financial reports | FINANCE_ADMIN, Manager | Summary by period, employee | Export |

---

### 2.8 Complaints Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Complaint List** | View complaints | All (based on access) | Subject, severity, status, owner | Filter, Create |
| **Complaint Detail** | Full complaint info | Owner, Escalation chain | All fields, actions, history | Update, Escalate |
| **Complaint Create** | Log new complaint | All | Subject, description, severity, context | Submit |
| **Complaint Actions** | Action history | Owner, Escalation chain | Action list with timestamps | Add action |
| **SLA Dashboard** | SLA compliance | Manager+, SYSTEM_ADMIN | Breach count, compliance % | Drill down |
| **SLA Configuration** | Configure SLAs | SYSTEM_ADMIN | SLA rules by severity | Edit rules |
| **Escalation Rules** | Configure escalation | SYSTEM_ADMIN | Escalation levels, time triggers | Edit rules |

---

### 2.9 Reports Module Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **Report Builder** | Custom reports | Manager+ | Data source, filters, columns | Generate, Export |
| **Task Reports** | Task analytics | Manager+ | Status distribution, overdue, workload | Filter, Export |
| **HR Reports** | HR analytics | HR_ADMIN | Headcount, attendance, leave | Filter, Export |
| **Training Reports** | Training analytics | TRAINING_ADMIN | Completion rates, scores | Filter, Export |
| **Expense Reports** | Financial analytics | FINANCE_ADMIN | Spend by category, employee | Filter, Export |
| **Complaint Reports** | Complaint analytics | Manager+ | SLA compliance, resolution time | Filter, Export |

---

### 2.10 System/Settings Screens

| Screen | Purpose | Roles | Key Data | Primary Actions |
|--------|---------|-------|----------|-----------------|
| **User Profile** | Personal settings | All | Name, email, preferences | Edit, Change password |
| **Notification Preferences** | Notification settings | All | Notification types, channels | Toggle |
| **System Settings** | Platform configuration | SYSTEM_ADMIN | SLA rules, workflows, categories | Edit |
| **Audit Log Viewer** | View audit logs | SYSTEM_ADMIN | Action log entries | Search, Filter |
| **Role Management** | Manage roles | HR_ADMIN, SYSTEM_ADMIN | Role assignments | Assign, Revoke |

---

### 2.11 Screen Count Summary

| Module | Screen Count |
|--------|--------------|
| Authentication | 5 |
| Dashboard | 5 |
| Mind Mapping | 5 |
| Task Management | 8 |
| HR Management | 14 |
| Training | 13 |
| Expense Management | 7 |
| Complaints | 7 |
| Reports | 6 |
| System/Settings | 5 |
| **Total** | **75** |

---

## 3. User Flow Wireframes (Task 1.5.2)

### 3.1 Login & Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LOGIN & AUTHENTICATION FLOW                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Login Page    │     │   Dashboard     │     │  Forgot Pass    │
│                 │     │                 │     │                 │
│ ┌─────────────┐ │     │ ┌─────────────┐ │     │ ┌─────────────┐ │
│ │   Logo      │ │     │ │  Welcome!   │ │     │ │  Email      │ │
│ └─────────────┘ │     │ │  [User]     │ │     │ │  [________] │ │
│                 │     │ └─────────────┘ │     │ └─────────────┘ │
│ ┌─────────────┐ │     │                 │     │                 │
│ │ Email       │ │     │ ┌─────────────┐ │     │ [Send Reset]   │
│ │ [_________] │ │     │ │  Widgets    │ │     │                 │
│ └─────────────┘ │     │ │  - Tasks    │ │     │ "Check email"   │
│                 │     │ │  - Approvals│ │     │                 │
│ ┌─────────────┐ │     │ │  - Notifs   │ │     └────────┬────────┘
│ │ Password    │ │     │ └─────────────┘ │              │
│ │ [_________] │ │     │                 │              │
│ └─────────────┘ │     └────────┬────────┘              │
│                 │              │                        │
│ [Login Button]──┼──Success────►│                        │
│                 │              │                        │
│ "Forgot Pass?"──┼──────────────┼────────────────────────┘
│                 │              │
└─────────────────┘              │
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌─────────────────┐                             ┌─────────────────┐
│ Reset Password  │                             │ Change Password │
│                 │                             │                 │
│ New Password    │                             │ Current Pass    │
│ [_____________] │                             │ [_____________] │
│                 │                             │                 │
│ Confirm Pass    │                             │ New Password    │
│ [_____________] │                             │ [_____________] │
│                 │                             │                 │
│ [Reset Button]  │                             │ [Change Button] │
│                 │                             │                 │
└─────────────────┘                             └─────────────────┘
```

**Flow Steps**:
1. User enters email and password on Login page
2. On success → redirect to Dashboard
3. On failure → show error message, increment attempt counter
4. After 5 failures → account locked for 15 minutes
5. "Forgot Password" → enters email → receives reset link
6. Reset link → Reset Password page → submit → Login page

---

### 3.2 Task Creation & Assignment Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TASK CREATION & ASSIGNMENT FLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Task List      │     │ Task Form       │     │ Task Created    │
│  (List/Kanban)  │     │                 │     │                 │
│                 │     │ Title*          │     │ ┌─────────────┐ │
│ ┌─────────────┐ │     │ [____________]  │     │ │  ✓ Success  │ │
│ │ + New Task  │─┼────►│                 │     │ │  Task #123  │ │
│ └─────────────┘ │     │ Description     │     │ │  created!   │ │
│                 │     │ [____________]  │     │ └─────────────┘ │
│ ┌─────────────┐ │     │ [____________]  │     │                 │
│ │ Task 1     ▼│ │     │                 │     │ [View Task]     │
│ │ Task 2     ▼│ │     │ Assignee*       │     │ [Create Another]│
│ │ Task 3     ▼│ │     │ [▼ Select... ]  │     │                 │
│ └─────────────┘ │     │  ├── John Doe   │     └────────┬────────┘
│                 │     │  ├── Jane Smith │              │
│ Filter: [All ▼] │     │  └── Team Lead  │              │
│ Sort: [Date ▼]  │     │                 │              │
│                 │     │ Priority        │              │
└─────────────────┘     │ (●) Low  ( ) Med│              │
                        │ ( ) High ( ) Crit│             │
                        │                 │              │
                        │ Due Date (ECD)  │              │
                        │ [📅 Pick date]  │              │
                        │                 │              │
                        │ Labels          │              │
                        │ [+ Add label]   │              │
                        │                 │              │
                        │ [Cancel] [Save]─┼─────────────►│
                        │                 │              │
                        └─────────────────┘              │
                                                         │
                                                         ▼
                                              ┌─────────────────┐
                                              │ Task Detail     │
                                              │                 │
                                              │ Title: Task #123│
                                              │ Status: Open    │
                                              │ Assignee: John  │
                                              │                 │
                                              │ [Sub-tasks]     │
                                              │ [Comments]      │
                                              │ [Attachments]   │
                                              │                 │
                                              │ [Edit] [Delete] │
                                              └─────────────────┘
```

**Flow Steps**:
1. User clicks "+ New Task" from Task List or Kanban
2. Task form opens (modal or page)
3. User fills required fields (title, assignee)
4. Assignee dropdown shows hierarchy-based options (self + subordinates for managers)
5. User clicks Save
6. Task created with status "Not Started"
7. Notification sent to assignee
8. User can view task detail or create another

---

### 3.3 Approval Workflow Flow (Expense)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         EXPENSE APPROVAL WORKFLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

EMPLOYEE                    MANAGER                     FINANCE
    │                          │                           │
    ▼                          │                           │
┌─────────────────┐            │                           │
│ Create Expense  │            │                           │
│                 │            │                           │
│ Amount: ₹5,000  │            │                           │
│ Type: Travel    │            │                           │
│ Description     │            │                           │
│ [📎 Receipts]   │            │                           │
│                 │            │                           │
│ [Save Draft]    │            │                           │
│ [Submit]────────┼───────────►│                           │
└─────────────────┘            │                           │
                               ▼                           │
                    ┌─────────────────┐                   │
                    │ Approval Queue  │                   │
                    │                 │                   │
                    │ ┌─────────────┐ │                   │
                    │ │ Expense #45 │ │                   │
                    │ │ ₹5,000      │ │                   │
                    │ │ [View]      │ │                   │
                    │ └─────────────┘ │                   │
                    │                 │                   │
                    │ [Approve]───────┼──────────────────►│
                    │ [Reject]        │                   │
                    │ [Request Info]  │                   │
                    │                 │                   │
                    └─────────────────┘                   │
                                                          ▼
                                              ┌─────────────────┐
                                              │ Finance Queue   │
                                              │                 │
                                              │ ┌─────────────┐ │
                                              │ │ Expense #45 │ │
                                              │ │ ₹5,000      │ │
                                              │ │ Mgr: ✓      │ │
                                              │ └─────────────┘ │
                                              │                 │
                                              │ [Approve]       │
                                              │ [Reject]        │
                                              │                 │
                                              └────────┬────────┘
                                                       │
                                                       ▼
                                              ┌─────────────────┐
                                              │ Payment Process │
                                              │                 │
                                              │ Mode: [▼ Bank]  │
                                              │ Ref: [________] │
                                              │ Date: [📅]      │
                                              │                 │
                                              │ [Mark Paid]     │
                                              │                 │
                                              └────────┬────────┘
                                                       │
    ┌──────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────┐
│ Expense Paid    │
│                 │
│ Status: PAID    │
│ ✓ Manager       │
│ ✓ Finance       │
│ ✓ Payment Ref   │
│                 │
│ [Download PDF]  │
└─────────────────┘
```

**Flow Steps**:
1. Employee creates expense, adds receipts, submits
2. Status: SUBMITTED
3. Manager receives notification, reviews in Approval Queue
4. Manager approves → Status: MANAGER_APPROVED
5. Finance Admin receives notification, reviews
6. Finance approves → Status: FINANCE_APPROVED
7. Finance processes payment, enters payment details
8. Status: PAID, employee notified

---

### 3.4 Mind Map Creation & Task Linking Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MIND MAP CREATION & TASK LINKING                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────────────────────────────────────────┐
│ Mind Map List   │     │                 Mind Map Canvas                      │
│                 │     │                                                      │
│ [+ New Map]─────┼────►│    ┌─────┐                                          │
│                 │     │    │Root │                                          │
│ ┌─────────────┐ │     │    │Node │                                          │
│ │ Map 1      ▼│ │     │    └──┬──┘                                          │
│ │ Map 2      ▼│ │     │       │                                              │
│ │ Map 3      ▼│ │     │    ┌──┴───────────┐                                  │
│ └─────────────┘ │     │    │              │                                  │
│                 │     │ ┌──┴──┐        ┌──┴──┐                               │
│ Templates: [▼]  │     │ │Idea │        │Task │←── Linked Task Node           │
│                 │     │ │Node │        │Link │    (shows task status)        │
└─────────────────┘     │ └─────┘        └──┬──┘                               │
                        │                   │                                   │
                        │                   │ Right-click                       │
                        │                   ▼                                   │
                        │           ┌─────────────┐                            │
                        │           │ Context Menu│                            │
                        │           │             │                            │
                        │           │ • Edit Node │                            │
                        │           │ • Add Child │                            │
                        │           │ • Link Task │◄── Creates new task        │
                        │           │ • Delete    │                            │
                        │           └─────────────┘                            │
                        │                                                      │
                        │  [Toolbar: Add Node | Undo | Redo | Zen Mode | Save] │
                        └──────────────────────────────────────────────────────┘
                                              │
                                              │ "Link Task" clicked
                                              ▼
                                   ┌─────────────────┐
                                   │ Link Task Modal │
                                   │                 │
                                   │ ( ) Link Existing│
                                   │     [▼ Search]  │
                                   │                 │
                                   │ (●) Create New  │
                                   │     Title:      │
                                   │     [_________] │
                                   │     Assignee:   │
                                   │     [▼ Select]  │
                                   │                 │
                                   │ [Cancel] [Link] │
                                   └─────────────────┘
```

**Flow Steps**:
1. User opens Mind Map Canvas (new or existing)
2. User adds nodes (Idea, Activity, Reference types)
3. User right-clicks a node → Context Menu
4. User selects "Link Task"
5. Modal opens: Link existing task OR create new
6. If create new: Task created in Task module, node becomes "Linked Task" type
7. Linked Task node displays task status badge
8. Deleting node does NOT delete the task

---

### 3.5 Complaint Filing & Escalation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      COMPLAINT FILING & ESCALATION                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Complaint Form  │     │ Complaint Detail│     │ Escalation      │
│                 │     │                 │     │                 │
│ Subject*        │     │ #CMP-2024-001   │     │ ⚠ SLA BREACH    │
│ [____________]  │     │                 │     │                 │
│                 │     │ Subject: ...    │     │ Time elapsed:   │
│ Description*    │     │ Status: In Prog │     │ 26 hours        │
│ [____________]  │     │ Owner: John     │     │                 │
│ [____________]  │     │ SLA: 24 hours   │     │ Original owner: │
│                 │     │                 │     │ John (L1)       │
│ Severity        │     │ ┌─────────────┐ │     │                 │
│ ( ) Low         │     │ │Action Log   │ │     │ Escalated to:   │
│ (●) Medium      │     │ │             │ │     │ Mary (L2 Mgr)   │
│ ( ) High        │     │ │ [+ Add Act] │ │     │                 │
│ ( ) Critical    │     │ └─────────────┘ │     │ [View Details]  │
│                 │     │                 │     │                 │
│ Context (opt)   │     │ [Reassign]      │     └─────────────────┘
│ Claim #: [____] │     │ [Resolve]       │              ▲
│ Client: [____]  │     │ [Close]         │              │
│                 │     │                 │              │
│ [Submit]────────┼────►│                 │──Auto────────┘
│                 │     │                 │  escalate
└─────────────────┘     └─────────────────┘  on breach
```

**Flow Steps**:
1. User creates complaint with subject, description, severity
2. Optional: Link to claim number, client, etc.
3. Complaint assigned to owner (based on rules)
4. Owner adds actions/notes to Action Log
5. If SLA breached → auto-escalation to next level manager
6. Escalation notifications sent
7. Owner resolves → Status: Resolved
8. Closure requires remarks → Status: Closed

---

### 3.6 Leave Request & Approval Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        LEAVE REQUEST & APPROVAL                             │
└─────────────────────────────────────────────────────────────────────────────┘

EMPLOYEE                              MANAGER
    │                                    │
    ▼                                    │
┌─────────────────┐                      │
│ Leave Balance   │                      │
│                 │                      │
│ Annual: 12 days │                      │
│ Sick: 6 days    │                      │
│ Casual: 3 days  │                      │
│                 │                      │
│ [Apply Leave]───┼─┐                    │
└─────────────────┘ │                    │
                    │                    │
                    ▼                    │
         ┌─────────────────┐             │
         │ Leave Request   │             │
         │                 │             │
         │ Type: [▼ Annual]│             │
         │                 │             │
         │ From: [📅]      │             │
         │ To:   [📅]      │             │
         │ Days: 3         │             │
         │                 │             │
         │ Reason:         │             │
         │ [____________]  │             │
         │                 │             │
         │ [Submit]────────┼────────────►│
         └─────────────────┘             │
                                         ▼
                              ┌─────────────────┐
                              │ Manager Queue   │
                              │                 │
                              │ ┌─────────────┐ │
                              │ │ Leave Req   │ │
                              │ │ John Doe    │ │
                              │ │ Jan 15-17   │ │
                              │ │ 3 days      │ │
                              │ └─────────────┘ │
                              │                 │
                              │ [Approve]       │
                              │ [Reject]        │
                              │                 │
                              └────────┬────────┘
                                       │
         ┌─────────────────────────────┘
         │
         ▼
┌─────────────────┐
│ Leave Status    │
│                 │
│ Request #LR-123 │
│ Status: APPROVED│
│                 │
│ Balance updated:│
│ Annual: 9 days  │
│                 │
└─────────────────┘
```

---

## 4. Component Hierarchy (Task 1.5.3)

### 4.1 Atomic Components (Level 1)

Basic building blocks with single responsibility.

| Component | Props | Description |
|-----------|-------|-------------|
| `Button` | variant, size, disabled, loading, icon | Primary, secondary, ghost, danger variants |
| `Input` | type, placeholder, error, disabled | Text, email, password, number inputs |
| `Textarea` | rows, placeholder, error, disabled | Multi-line text input |
| `Select` | options, placeholder, error, multiple | Dropdown selection |
| `Checkbox` | checked, disabled, label | Single checkbox |
| `Radio` | options, value, disabled | Radio button group |
| `Switch` | checked, disabled, label | Toggle switch |
| `Badge` | variant, size | Status badges (success, warning, error, info) |
| `Avatar` | src, name, size | User avatar with fallback initials |
| `Icon` | name, size, color | Lucide icon wrapper |
| `Spinner` | size | Loading spinner |
| `Tooltip` | content, position | Hover tooltip |
| `Label` | required | Form field label |
| `HelperText` | error | Field helper/error text |

---

### 4.2 Molecule Components (Level 2)

Combinations of atomic components.

| Component | Composition | Description |
|-----------|-------------|-------------|
| `FormField` | Label + Input + HelperText | Complete form field with validation |
| `SearchInput` | Input + Icon + Button | Search with clear button |
| `SelectField` | Label + Select + HelperText | Dropdown with label |
| `DatePicker` | Input + Calendar popup | Date selection |
| `DateRangePicker` | 2x DatePicker | Date range selection |
| `UserSelect` | Select + Avatar | User/employee selector |
| `StatusBadge` | Badge + Icon | Status with icon (e.g., ✓ Approved) |
| `PriorityBadge` | Badge | Color-coded priority indicator |
| `FileUploader` | Input + Button + Progress | File upload with preview |
| `Pagination` | Buttons + Text | Page navigation |
| `SortableHeader` | Text + Icon | Sortable table column header |
| `EmptyState` | Icon + Text + Button | Empty data state |
| `LoadingState` | Spinner + Text | Loading indicator |
| `ErrorState` | Icon + Text + Button | Error with retry |

---

### 4.3 Organism Components (Level 3)

Complex components with business logic.

| Component | Composition | Description |
|-----------|-------------|-------------|
| `Header` | Logo + Navigation + UserMenu + Notifications | Application header |
| `Sidebar` | Logo + NavMenu + Footer | Navigation sidebar |
| `DataTable` | SortableHeader + Rows + Pagination | Sortable, paginated table |
| `FilterBar` | SearchInput + SelectField + DatePicker | Filter controls |
| `TaskCard` | Badge + Text + Avatar + Actions | Task summary card |
| `KanbanColumn` | Header + TaskCards | Kanban board column |
| `UserCard` | Avatar + Text + Badge | User/employee summary |
| `ApprovalCard` | UserCard + Details + Actions | Approval request card |
| `NotificationItem` | Icon + Text + Timestamp | Single notification |
| `NotificationPanel` | Header + NotificationItems + Actions | Notification dropdown |
| `CommentThread` | Comments + Input + Button | Comment list with reply |
| `FileList` | FileItems + Upload | File attachments list |
| `ActivityLog` | Timeline + ActivityItems | Audit/action history |
| `StatCard` | Icon + Number + Label + Trend | Dashboard metric card |
| `ChartCard` | Title + Chart + Legend | Dashboard chart wrapper |
| `MindMapNode` | NodeContent + Connectors + Actions | Mind map node |
| `OrgChartNode` | UserCard + Connectors | Org hierarchy node |

---

### 4.4 Template Components (Level 4)

Page layouts and structural components.

| Component | Composition | Description |
|-----------|-------------|-------------|
| `AppLayout` | Header + Sidebar + Main + Footer | Main application layout |
| `AuthLayout` | Logo + Card + Footer | Authentication pages layout |
| `DashboardLayout` | Header + StatCards + Charts + Tables | Dashboard page layout |
| `ListPageLayout` | Header + FilterBar + DataTable + Pagination | List page layout |
| `DetailPageLayout` | Header + Content + Sidebar + Actions | Detail view layout |
| `FormPageLayout` | Header + Form + Actions | Form page layout |
| `ModalLayout` | Header + Content + Actions | Modal dialog layout |
| `SplitLayout` | LeftPanel + RightPanel | Two-column layout |
| `CanvasLayout` | Toolbar + Canvas + Panels | Mind map canvas layout |

---

### 4.5 Component Composition Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT HIERARCHY                                  │
└─────────────────────────────────────────────────────────────────────────────┘

                          ┌─────────────────┐
                          │    AppLayout    │ ◄── Template (Level 4)
                          └────────┬────────┘
                                   │
          ┌────────────────────────┼────────────────────────┐
          │                        │                        │
          ▼                        ▼                        ▼
   ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
   │   Header    │         │   Sidebar   │         │    Main     │
   │  (Organism) │         │  (Organism) │         │  (Content)  │
   └──────┬──────┘         └──────┬──────┘         └──────┬──────┘
          │                       │                       │
    ┌─────┴─────┐           ┌─────┴─────┐           ┌─────┴─────┐
    │           │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼           ▼
┌───────┐  ┌───────┐   ┌───────┐  ┌───────┐   ┌───────┐  ┌───────┐
│ Logo  │  │NavMenu│   │NavItem│  │NavItem│   │DataTbl│  │StatCrd│
│(Atom) │  │(Mol)  │   │(Mol)  │  │(Mol)  │   │(Org)  │  │(Org)  │
└───────┘  └───────┘   └───────┘  └───────┘   └───┬───┘  └───────┘
                                                   │
                                             ┌─────┴─────┐
                                             │           │
                                             ▼           ▼
                                        ┌───────┐  ┌───────┐
                                        │Button │  │Badge  │
                                        │(Atom) │  │(Atom) │
                                        └───────┘  └───────┘
```

---

## 5. Design System (Task 1.5.4)

### 5.1 Color Palette

#### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary-50 | #EEF2FF | 238, 242, 255 | Hover backgrounds |
| Primary-100 | #E0E7FF | 224, 231, 255 | Active backgrounds |
| Primary-200 | #C7D2FE | 199, 210, 254 | Focus rings |
| Primary-500 | #6366F1 | 99, 102, 241 | Primary buttons, links |
| Primary-600 | #4F46E5 | 79, 70, 229 | Primary hover |
| Primary-700 | #4338CA | 67, 56, 202 | Primary active |
| Primary-900 | #312E81 | 49, 46, 129 | Primary text |

#### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success-500 | #22C55E | Success states, completed |
| Success-50 | #F0FDF4 | Success background |
| Warning-500 | #F59E0B | Warning states, pending |
| Warning-50 | #FFFBEB | Warning background |
| Error-500 | #EF4444 | Error states, destructive |
| Error-50 | #FEF2F2 | Error background |
| Info-500 | #3B82F6 | Information states |
| Info-50 | #EFF6FF | Info background |

#### Neutral Colors

| Name | Hex | Usage |
|------|-----|-------|
| Gray-50 | #F9FAFB | Page backgrounds |
| Gray-100 | #F3F4F6 | Card backgrounds |
| Gray-200 | #E5E7EB | Borders, dividers |
| Gray-300 | #D1D5DB | Disabled states |
| Gray-400 | #9CA3AF | Placeholder text |
| Gray-500 | #6B7280 | Secondary text |
| Gray-700 | #374151 | Primary text |
| Gray-900 | #111827 | Headings |

---

### 5.2 Typography

#### Font Family

```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

#### Type Scale

| Name | Size | Line Height | Weight | Usage |
|------|------|-------------|--------|-------|
| `text-xs` | 12px | 16px | 400 | Labels, captions |
| `text-sm` | 14px | 20px | 400 | Body small, table cells |
| `text-base` | 16px | 24px | 400 | Body text |
| `text-lg` | 18px | 28px | 500 | Subheadings |
| `text-xl` | 20px | 28px | 600 | Card titles |
| `text-2xl` | 24px | 32px | 600 | Section headings |
| `text-3xl` | 30px | 36px | 700 | Page titles |
| `text-4xl` | 36px | 40px | 700 | Dashboard numbers |

#### Font Weights

| Name | Value | Usage |
|------|-------|-------|
| `font-normal` | 400 | Body text |
| `font-medium` | 500 | Labels, buttons |
| `font-semibold` | 600 | Headings |
| `font-bold` | 700 | Emphasis |

---

### 5.3 Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | None |
| `space-1` | 4px | Tight spacing |
| `space-2` | 8px | Compact elements |
| `space-3` | 12px | Related elements |
| `space-4` | 16px | Default spacing |
| `space-5` | 20px | Comfortable spacing |
| `space-6` | 24px | Section padding |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Section margins |
| `space-12` | 48px | Page sections |
| `space-16` | 64px | Major sections |

---

### 5.4 Elevation / Shadows

| Name | Value | Usage |
|------|-------|-------|
| `shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| `shadow` | `0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)` | Cards |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)` | Dropdowns |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)` | Modals |
| `shadow-xl` | `0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)` | Popovers |

---

### 5.5 Border Radius

| Name | Value | Usage |
|------|-------|-------|
| `rounded-none` | 0px | Sharp corners |
| `rounded-sm` | 2px | Minimal rounding |
| `rounded` | 4px | Default |
| `rounded-md` | 6px | Buttons, inputs |
| `rounded-lg` | 8px | Cards |
| `rounded-xl` | 12px | Large cards |
| `rounded-2xl` | 16px | Modals |
| `rounded-full` | 9999px | Avatars, pills |

---

### 5.6 Iconography

**Icon Library**: Lucide React

| Category | Examples | Size |
|----------|----------|------|
| Navigation | Menu, ChevronLeft, ChevronRight, Home | 20px |
| Actions | Plus, Edit, Trash, Download, Upload | 16px - 20px |
| Status | Check, X, AlertTriangle, Info, Clock | 16px |
| Objects | File, Folder, User, Calendar, Mail | 20px |
| Arrows | ArrowUp, ArrowDown, ArrowLeft, ArrowRight | 16px |

**Icon Guidelines**:
- Use consistent stroke width (1.5px default)
- Pair with text labels for clarity
- Maintain 4px padding around icons
- Use semantic colors for status icons

---

## 6. Responsive Design (Task 1.5.5)

### 6.1 Breakpoints

| Name | Min Width | Target Devices |
|------|-----------|----------------|
| `xs` | 0px | Small phones |
| `sm` | 640px | Large phones, small tablets |
| `md` | 768px | Tablets portrait |
| `lg` | 1024px | Tablets landscape, small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large desktops |

### 6.2 Layout Strategy

**Approach**: Mobile-first with progressive enhancement

| Breakpoint | Layout Behavior |
|------------|-----------------|
| **xs-sm** (< 640px) | Single column, hamburger menu, stacked cards |
| **sm-md** (640-768px) | Single column, expanded navigation |
| **md-lg** (768-1024px) | Two columns, collapsible sidebar |
| **lg-xl** (1024-1280px) | Full layout, sidebar visible |
| **xl+** (> 1280px) | Full layout, expanded content |

### 6.3 Component Adaptation

| Component | Mobile (< 768px) | Tablet (768-1024px) | Desktop (> 1024px) |
|-----------|------------------|---------------------|-------------------|
| **Header** | Logo + hamburger | Logo + condensed nav | Full navigation |
| **Sidebar** | Drawer (overlay) | Collapsible | Always visible |
| **DataTable** | Card view | Scrollable table | Full table |
| **Kanban** | Single column + tabs | 2 columns visible | All columns |
| **Dashboard** | Stacked widgets | 2-column grid | 3-4 column grid |
| **Forms** | Full width | 2-column | 2-3 column |
| **Modals** | Full screen | Centered (80% width) | Centered (max 640px) |

### 6.4 Touch Targets

| Element | Minimum Size | Recommended Size |
|---------|--------------|------------------|
| Buttons | 44x44px | 48x48px |
| Links | 44x44px touch area | 48x48px |
| Form inputs | 44px height | 48px height |
| List items | 48px height | 56px height |

---

## 7. Accessibility Requirements (Task 1.5.6)

### 7.1 WCAG 2.1 Level AA Compliance

MindFlow targets **WCAG 2.1 Level AA** compliance.

### 7.2 Keyboard Navigation

| Requirement | Implementation |
|-------------|----------------|
| **Tab Order** | Logical tab sequence following visual layout |
| **Focus Indicators** | Visible 2px outline in primary color |
| **Skip Links** | "Skip to main content" link at page top |
| **Modal Focus Trap** | Focus contained within open modals |
| **Keyboard Shortcuts** | Escape closes modals, Enter submits forms |
| **Arrow Navigation** | Menus, dropdowns navigable with arrows |

#### Focus Ring Style

```css
:focus-visible {
  outline: 2px solid var(--primary-500);
  outline-offset: 2px;
}
```

### 7.3 Screen Reader Support

| Requirement | Implementation |
|-------------|----------------|
| **Semantic HTML** | Use proper heading hierarchy (h1 → h6) |
| **ARIA Labels** | All interactive elements have accessible names |
| **ARIA Roles** | Custom components use appropriate roles |
| **Live Regions** | Toast notifications use `aria-live="polite"` |
| **Form Labels** | All inputs have associated labels |
| **Error Announcements** | Form errors announced to screen readers |

#### ARIA Patterns

```html
<!-- Button with icon only -->
<button aria-label="Close dialog">
  <Icon name="x" />
</button>

<!-- Loading state -->
<button aria-busy="true" aria-disabled="true">
  <Spinner /> Saving...
</button>

<!-- Modal dialog -->
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Confirm Action</h2>
</div>

<!-- Status notification -->
<div role="status" aria-live="polite">
  Task saved successfully
</div>
```

### 7.4 Color Contrast

| Element | Minimum Ratio | Target Ratio |
|---------|---------------|--------------|
| Normal text | 4.5:1 | 7:1 |
| Large text (18px+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 4.5:1 |
| Focus indicators | 3:1 | 4.5:1 |

#### Color Combinations

| Foreground | Background | Ratio | Pass |
|------------|------------|-------|------|
| Gray-700 (#374151) | White (#FFFFFF) | 10.9:1 | AAA |
| Gray-500 (#6B7280) | White (#FFFFFF) | 5.0:1 | AA |
| Primary-600 (#4F46E5) | White (#FFFFFF) | 4.6:1 | AA |
| Error-500 (#EF4444) | White (#FFFFFF) | 4.0:1 | AA (large) |

### 7.5 Focus Management

| Scenario | Focus Behavior |
|----------|----------------|
| **Modal opens** | Focus moves to first focusable element in modal |
| **Modal closes** | Focus returns to trigger element |
| **Form submission** | Focus moves to success message or first error |
| **Page navigation** | Focus moves to main content heading |
| **Tab closes** | Focus moves to adjacent tab |
| **Dropdown opens** | Focus moves to first option |

### 7.6 Error Handling

| Requirement | Implementation |
|-------------|----------------|
| **Error identification** | Error text + red border + icon |
| **Error description** | Clear message explaining how to fix |
| **Error association** | Error linked to input via `aria-describedby` |
| **Error summary** | List of errors at form top (linked to fields) |

```html
<div class="form-field">
  <label for="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid="true"
    aria-describedby="email-error"
  />
  <p id="email-error" class="error" role="alert">
    Please enter a valid email address
  </p>
</div>
```

---

## 8. State Management Strategy (Task 1.5.7)

### 8.1 Strategy Overview

MindFlow uses a **hybrid state management** approach:

| State Type | Technology | Purpose |
|------------|------------|---------|
| **Server State** | TanStack React Query | API data fetching, caching, synchronization |
| **Client State** | Zustand | UI state, user preferences, temporary state |
| **Form State** | React Hook Form | Form inputs, validation, submission |
| **URL State** | Next.js Router | Filters, pagination, navigation |

### 8.2 TanStack React Query (Server State)

**Purpose**: Manage all data fetched from the backend API.

#### Configuration

```typescript
// lib/query-client.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: 3,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});
```

#### Query Keys Convention

```typescript
// lib/query-keys.ts
export const queryKeys = {
  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: TaskFilters) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
  },
  // Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: EmployeeFilters) => [...queryKeys.employees.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.employees.all, 'detail', id] as const,
    subordinates: (managerId: string) => [...queryKeys.employees.all, 'subordinates', managerId] as const,
  },
  // Add similar patterns for other entities
};
```

#### Example Usage

```typescript
// hooks/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { taskApi } from '@/lib/api/tasks';

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => taskApi.getAll(filters),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taskApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
```

### 8.3 Zustand (Client State)

**Purpose**: Manage UI state that doesn't come from the server.

#### Store Structure

```typescript
// stores/ui-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // View preferences
  taskView: 'list' | 'kanban' | 'calendar';
  setTaskView: (view: 'list' | 'kanban' | 'calendar') => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      theme: 'system',
      setTheme: (theme) => set({ theme }),

      taskView: 'list',
      setTaskView: (taskView) => set({ taskView }),
    }),
    {
      name: 'mindflow-ui',
    }
  )
);
```

```typescript
// stores/auth-store.ts
import { create } from 'zustand';

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isAuthenticated: false,

  setAuth: (accessToken, user) => set({
    accessToken,
    user,
    isAuthenticated: true,
  }),

  clearAuth: () => set({
    accessToken: null,
    user: null,
    isAuthenticated: false,
  }),
}));
```

### 8.4 Form State (React Hook Form + Zod)

**Purpose**: Manage form inputs, validation, and submission.

#### Example Form

```typescript
// components/forms/TaskForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  assigneeId: z.string().uuid('Invalid assignee'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  dueDate: z.string().optional(),
  labels: z.array(z.string()).optional(),
});

type TaskFormData = z.infer<typeof taskSchema>;

export function TaskForm({ onSubmit, defaultValues }: TaskFormProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: defaultValues || {
      title: '',
      priority: 'MEDIUM',
      labels: [],
    },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* Form fields */}
    </form>
  );
}
```

### 8.5 State Boundaries

| State Location | What Belongs Here | What Doesn't |
|----------------|-------------------|--------------|
| **React Query** | API responses, cached data, loading/error states | UI preferences, form inputs |
| **Zustand** | UI state, user preferences, temporary filters | API data, form validation |
| **React Hook Form** | Form inputs, field errors, submission state | Global state, API responses |
| **URL (Router)** | Active filters, pagination, selected tab | User preferences, form data |
| **Component State** | Dropdown open/close, hover states | Shared state, persisted state |

---

## 9. Routing & Navigation (Task 1.5.8)

### 9.1 Route Structure

```
/
├── /auth
│   ├── /login                    # Login page
│   ├── /forgot-password          # Forgot password
│   ├── /reset-password           # Reset password (with token)
│   └── /change-password          # Change password (authenticated)
│
├── /dashboard                    # Main dashboard
│
├── /mindmaps
│   ├── /                         # Mind map list
│   ├── /new                      # Create new (optional template)
│   ├── /[id]                     # View/edit mind map
│   └── /templates                # Template gallery
│
├── /tasks
│   ├── /                         # Task list (default view)
│   ├── /board                    # Kanban view
│   ├── /calendar                 # Calendar view
│   ├── /my                       # My assigned tasks
│   ├── /team                     # Team tasks (managers)
│   ├── /new                      # Create task
│   └── /[id]                     # Task detail
│
├── /hr
│   ├── /employees
│   │   ├── /                     # Employee directory
│   │   ├── /new                  # Add employee
│   │   └── /[id]                 # Employee profile
│   ├── /positions                # Position management
│   ├── /hierarchy                # Org chart
│   ├── /candidates
│   │   ├── /                     # Candidate list
│   │   └── /[id]                 # Candidate detail
│   ├── /attendance               # Attendance dashboard
│   ├── /leave
│   │   ├── /                     # Leave requests list
│   │   ├── /apply                # Apply for leave
│   │   └── /balance              # Leave balance
│   └── /payroll                  # Payroll references
│
├── /training
│   ├── /courses
│   │   ├── /                     # Course catalog
│   │   ├── /new                  # Create course (admin)
│   │   └── /[id]                 # Course detail
│   ├── /my-training              # My enrolled courses
│   ├── /sessions
│   │   ├── /                     # Session schedule
│   │   ├── /new                  # Schedule session (admin)
│   │   └── /[id]                 # Session detail
│   ├── /exams
│   │   ├── /                     # Exam list (admin)
│   │   ├── /take/[id]            # Take exam
│   │   └── /results/[id]         # Exam results
│   ├── /questions                # Question bank (admin)
│   └── /reports                  # Training reports
│
├── /expenses
│   ├── /                         # Expense list
│   ├── /new                      # Submit expense
│   ├── /[id]                     # Expense detail
│   ├── /approvals                # Approval queue
│   ├── /payments                 # Payment processing (finance)
│   └── /reports                  # Expense reports
│
├── /complaints
│   ├── /                         # Complaint list
│   ├── /new                      # Log complaint
│   ├── /[id]                     # Complaint detail
│   ├── /sla                      # SLA dashboard
│   └── /settings                 # SLA/escalation config (admin)
│
├── /reports
│   ├── /                         # Report builder
│   ├── /tasks                    # Task reports
│   ├── /hr                       # HR reports
│   ├── /training                 # Training reports
│   ├── /expenses                 # Expense reports
│   └── /complaints               # Complaint reports
│
├── /settings
│   ├── /profile                  # User profile
│   ├── /notifications            # Notification preferences
│   ├── /sessions                 # Active sessions
│   └── /system                   # System settings (admin)
│
└── /admin
    ├── /audit-logs               # Audit log viewer
    └── /roles                    # Role management
```

### 9.2 Protected Routes

| Route Pattern | Required Auth | Required Roles |
|---------------|---------------|----------------|
| `/auth/*` | No | None |
| `/dashboard` | Yes | Any authenticated |
| `/mindmaps/*` | Yes | Any authenticated |
| `/tasks/*` | Yes | Any authenticated |
| `/hr/employees/*` (write) | Yes | HR_ADMIN |
| `/hr/positions/*` | Yes | HR_ADMIN |
| `/hr/candidates/*` | Yes | HR_ADMIN |
| `/hr/attendance/*` (write) | Yes | HR_ADMIN, Manager (team) |
| `/hr/leave/approvals` | Yes | Manager+ |
| `/training/courses/*` (write) | Yes | TRAINING_ADMIN |
| `/training/questions/*` | Yes | TRAINING_ADMIN |
| `/expenses/approvals` | Yes | Manager, FINANCE_ADMIN |
| `/expenses/payments` | Yes | FINANCE_ADMIN |
| `/complaints/settings` | Yes | SYSTEM_ADMIN |
| `/settings/system` | Yes | SYSTEM_ADMIN |
| `/admin/*` | Yes | SYSTEM_ADMIN |

### 9.3 Navigation Menu Structure

```typescript
// lib/navigation.ts
export const mainNavigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
    roles: ['*'], // All authenticated users
  },
  {
    name: 'Mind Maps',
    href: '/mindmaps',
    icon: 'Brain',
    roles: ['*'],
  },
  {
    name: 'Tasks',
    href: '/tasks',
    icon: 'CheckSquare',
    roles: ['*'],
    children: [
      { name: 'List View', href: '/tasks' },
      { name: 'Board View', href: '/tasks/board' },
      { name: 'Calendar', href: '/tasks/calendar' },
      { name: 'My Tasks', href: '/tasks/my' },
      { name: 'Team Tasks', href: '/tasks/team', roles: ['MANAGER', 'HR_ADMIN', 'SYSTEM_ADMIN'] },
    ],
  },
  {
    name: 'HR',
    href: '/hr',
    icon: 'Users',
    roles: ['*'],
    children: [
      { name: 'Directory', href: '/hr/employees' },
      { name: 'Positions', href: '/hr/positions', roles: ['HR_ADMIN'] },
      { name: 'Org Chart', href: '/hr/hierarchy' },
      { name: 'Candidates', href: '/hr/candidates', roles: ['HR_ADMIN'] },
      { name: 'Attendance', href: '/hr/attendance' },
      { name: 'Leave', href: '/hr/leave' },
      { name: 'Payroll', href: '/hr/payroll', roles: ['HR_ADMIN', 'EMPLOYEE'] },
    ],
  },
  {
    name: 'Training',
    href: '/training',
    icon: 'GraduationCap',
    roles: ['*'],
    children: [
      { name: 'Courses', href: '/training/courses' },
      { name: 'My Training', href: '/training/my-training' },
      { name: 'Schedule', href: '/training/sessions' },
      { name: 'Question Bank', href: '/training/questions', roles: ['TRAINING_ADMIN'] },
      { name: 'Reports', href: '/training/reports', roles: ['TRAINING_ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Expenses',
    href: '/expenses',
    icon: 'Receipt',
    roles: ['*'],
    children: [
      { name: 'My Expenses', href: '/expenses' },
      { name: 'Submit New', href: '/expenses/new' },
      { name: 'Approvals', href: '/expenses/approvals', roles: ['MANAGER', 'FINANCE_ADMIN'] },
      { name: 'Payments', href: '/expenses/payments', roles: ['FINANCE_ADMIN'] },
      { name: 'Reports', href: '/expenses/reports', roles: ['FINANCE_ADMIN', 'MANAGER'] },
    ],
  },
  {
    name: 'Complaints',
    href: '/complaints',
    icon: 'AlertCircle',
    roles: ['*'],
    children: [
      { name: 'All Complaints', href: '/complaints' },
      { name: 'New Complaint', href: '/complaints/new' },
      { name: 'SLA Dashboard', href: '/complaints/sla', roles: ['MANAGER', 'SYSTEM_ADMIN'] },
      { name: 'Settings', href: '/complaints/settings', roles: ['SYSTEM_ADMIN'] },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: 'BarChart3',
    roles: ['MANAGER', 'HR_ADMIN', 'FINANCE_ADMIN', 'TRAINING_ADMIN', 'SYSTEM_ADMIN'],
  },
];
```

### 9.4 Breadcrumb Pattern

```
Dashboard > Tasks > Task #123

Dashboard > HR > Employees > John Doe

Dashboard > Training > Courses > Safety Training > Exam
```

### 9.5 Deep Linking Support

All entity detail pages support direct deep links:
- `/tasks/[task-uuid]` - Direct link to task
- `/expenses/[expense-uuid]` - Direct link to expense
- `/complaints/[complaint-uuid]` - Direct link to complaint

Query parameters for filters:
- `/tasks?status=IN_PROGRESS&priority=HIGH&assignee=user-uuid`
- `/expenses?status=PENDING&dateFrom=2026-01-01&dateTo=2026-01-31`

---

## 10. Form Validation & Error Display (Task 1.5.9)

### 10.1 Validation Strategy

| Validation Type | When Applied | Technology |
|-----------------|--------------|------------|
| **Client-side** | On blur + on submit | Zod schemas |
| **Real-time** | On change (debounced) | React Hook Form |
| **Server-side** | On API response | Backend FastAPI |

### 10.2 Validation Rules

#### Common Patterns

| Field Type | Rules | Error Message |
|------------|-------|---------------|
| **Required text** | `min(1)` | "This field is required" |
| **Email** | `email()` | "Please enter a valid email address" |
| **Password** | `min(12), regex` | "Password must be at least 12 characters with uppercase, lowercase, and number" |
| **Phone** | `regex(/^[0-9]{10}$/)` | "Please enter a valid 10-digit phone number" |
| **Date** | `date()` | "Please enter a valid date" |
| **Future date** | `refine(d => d > today)` | "Date must be in the future" |
| **Positive number** | `positive()` | "Must be a positive number" |
| **UUID** | `uuid()` | "Invalid selection" |

#### Example Validation Schema

```typescript
// schemas/expense.ts
import { z } from 'zod';

export const expenseSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .positive('Amount must be positive')
    .max(1000000, 'Amount cannot exceed ₹10,00,000'),

  expenseType: z
    .enum(['TRAVEL', 'FOOD', 'ACCOMMODATION', 'SUPPLIES', 'OTHER'], {
      required_error: 'Please select an expense type',
    }),

  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description cannot exceed 500 characters'),

  expenseDate: z
    .string()
    .refine((date) => new Date(date) <= new Date(), {
      message: 'Expense date cannot be in the future',
    }),

  receipts: z
    .array(z.object({
      fileId: z.string().uuid(),
      fileName: z.string(),
    }))
    .min(1, 'At least one receipt is required'),
});
```

### 10.3 Error Display Patterns

#### Field-Level Errors

```tsx
<FormField>
  <Label htmlFor="email" required>Email</Label>
  <Input
    id="email"
    type="email"
    {...register('email')}
    aria-invalid={!!errors.email}
    aria-describedby={errors.email ? 'email-error' : undefined}
    className={errors.email ? 'border-error-500' : ''}
  />
  {errors.email && (
    <HelperText id="email-error" error>
      <Icon name="AlertCircle" size={14} />
      {errors.email.message}
    </HelperText>
  )}
</FormField>
```

#### Form-Level Error Summary

```tsx
{Object.keys(errors).length > 0 && (
  <div role="alert" className="bg-error-50 border border-error-200 rounded-lg p-4 mb-4">
    <h3 className="text-error-700 font-semibold flex items-center gap-2">
      <Icon name="AlertTriangle" />
      Please fix the following errors:
    </h3>
    <ul className="mt-2 list-disc list-inside text-error-600">
      {Object.entries(errors).map(([field, error]) => (
        <li key={field}>
          <a href={`#${field}`} className="underline">
            {error?.message}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

### 10.4 Server Error Handling

```typescript
// hooks/useFormSubmit.ts
export function useFormSubmit<T>(
  mutation: UseMutationResult<unknown, Error, T>,
  form: UseFormReturn<T>
) {
  const onSubmit = async (data: T) => {
    try {
      await mutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError) {
        // Map server errors to form fields
        if (error.fieldErrors) {
          Object.entries(error.fieldErrors).forEach(([field, message]) => {
            form.setError(field as keyof T, { message });
          });
        } else {
          // Show general error
          toast.error(error.message);
        }
      }
    }
  };

  return { onSubmit };
}
```

### 10.5 Success Feedback

| Scenario | Feedback |
|----------|----------|
| **Form saved** | Success toast + redirect to detail page |
| **Draft saved** | Info toast "Draft saved" |
| **Submitted for approval** | Success toast + status change shown |
| **Inline edit** | Field highlights green briefly |

---

## 11. Loading & Empty States (Task 1.5.10)

### 11.1 Loading Indicators

#### Page Loading

```tsx
// components/loading/PageLoader.tsx
export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
      <span className="ml-3 text-gray-500">Loading...</span>
    </div>
  );
}
```

#### Button Loading

```tsx
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <Spinner size="sm" className="mr-2" />
      Saving...
    </>
  ) : (
    'Save'
  )}
</Button>
```

#### Skeleton Screens

```tsx
// components/loading/TaskListSkeleton.tsx
export function TaskListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="animate-pulse flex items-center p-4 border rounded-lg">
          <div className="w-6 h-6 bg-gray-200 rounded mr-4" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
          <div className="w-20 h-6 bg-gray-200 rounded" />
        </div>
      ))}
    </div>
  );
}
```

### 11.2 Empty States

#### No Data

```tsx
// components/empty/EmptyState.tsx
export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon name={icon} className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          <Icon name="Plus" className="mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

// Usage
<EmptyState
  icon="CheckSquare"
  title="No tasks yet"
  description="Get started by creating your first task. Tasks help you track work and collaborate with your team."
  action={{
    label: 'Create Task',
    onClick: () => router.push('/tasks/new'),
  }}
/>
```

#### No Search Results

```tsx
<EmptyState
  icon="Search"
  title="No results found"
  description={`No tasks match "${searchQuery}". Try adjusting your filters or search terms.`}
  action={{
    label: 'Clear Filters',
    onClick: clearFilters,
  }}
/>
```

#### No Permission

```tsx
<EmptyState
  icon="Lock"
  title="Access Restricted"
  description="You don't have permission to view this content. Contact your administrator if you believe this is an error."
/>
```

### 11.3 Error States

```tsx
// components/error/ErrorState.tsx
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this page.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 bg-error-50 rounded-full flex items-center justify-center mb-4">
        <Icon name="AlertTriangle" className="w-8 h-8 text-error-500" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-6">{description}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          <Icon name="RefreshCw" className="mr-2" />
          Try Again
        </Button>
      )}
    </div>
  );
}
```

### 11.4 Optimistic UI Updates

```typescript
// hooks/useUpdateTaskStatus.ts
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      taskApi.updateStatus(taskId, status),

    // Optimistic update
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });

      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));

      queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: Task) => ({
        ...old,
        status,
      }));

      return { previousTask };
    },

    // Revert on error
    onError: (err, variables, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(
          queryKeys.tasks.detail(variables.taskId),
          context.previousTask
        );
      }
      toast.error('Failed to update task status');
    },

    onSuccess: () => {
      toast.success('Status updated');
    },
  });
}
```

---

## 12. Notification Patterns (Task 1.5.11)

### 12.1 Toast Notifications

#### Position & Behavior

| Property | Value |
|----------|-------|
| **Position** | Top-right (desktop), Top-center (mobile) |
| **Duration** | Success: 3s, Info: 4s, Warning: 5s, Error: 6s |
| **Max visible** | 3 at a time |
| **Dismiss** | Click X or swipe |

#### Toast Types

```tsx
// lib/toast.ts
import { toast as hotToast } from 'react-hot-toast';

export const toast = {
  success: (message: string) => hotToast.success(message, {
    icon: '✓',
    duration: 3000,
  }),

  error: (message: string) => hotToast.error(message, {
    icon: '✕',
    duration: 6000,
  }),

  info: (message: string) => hotToast(message, {
    icon: 'ℹ',
    duration: 4000,
  }),

  warning: (message: string) => hotToast(message, {
    icon: '⚠',
    duration: 5000,
    style: { background: '#FFFBEB', color: '#92400E' },
  }),

  loading: (message: string) => hotToast.loading(message),

  promise: <T,>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) => hotToast.promise(promise, messages),
};
```

#### Usage Examples

```typescript
// Success
toast.success('Task created successfully');

// Error
toast.error('Failed to save. Please try again.');

// Promise
toast.promise(
  createTask(data),
  {
    loading: 'Creating task...',
    success: 'Task created!',
    error: 'Failed to create task',
  }
);
```

### 12.2 Modal Dialogs

#### Confirmation Dialog

```tsx
// components/dialogs/ConfirmDialog.tsx
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Usage
<ConfirmDialog
  open={showDeleteConfirm}
  onClose={() => setShowDeleteConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Task?"
  description="This action cannot be undone. The task and all its sub-tasks will be permanently deleted."
  confirmLabel="Delete"
  confirmVariant="danger"
/>
```

#### Alert Dialog

```tsx
// components/dialogs/AlertDialog.tsx
export function AlertDialog({
  open,
  onClose,
  title,
  description,
  variant = 'info', // info, warning, error
}: AlertDialogProps) {
  const icons = {
    info: <Info className="text-info-500" />,
    warning: <AlertTriangle className="text-warning-500" />,
    error: <XCircle className="text-error-500" />,
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <div className="flex gap-4">
          <div className="flex-shrink-0">{icons[variant]}</div>
          <div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 12.3 In-App Notification Center

#### Notification Panel

```tsx
// components/notifications/NotificationPanel.tsx
export function NotificationPanel() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" className="relative">
          <Bell />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          <Button variant="ghost" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={() => markAsRead(notification.id)}
              />
            ))
          )}
        </div>
        <div className="p-2 border-t">
          <Button variant="ghost" className="w-full" asChild>
            <Link href="/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
```

#### Notification Item

```tsx
// components/notifications/NotificationItem.tsx
export function NotificationItem({ notification, onRead }: NotificationItemProps) {
  const icons: Record<string, string> = {
    TASK_ASSIGNED: 'CheckSquare',
    TASK_COMPLETED: 'CheckCircle',
    APPROVAL_REQUIRED: 'Clock',
    EXPENSE_APPROVED: 'Receipt',
    COMPLAINT_ESCALATED: 'AlertTriangle',
  };

  return (
    <button
      onClick={() => {
        onRead();
        // Navigate to related entity
      }}
      className={cn(
        'w-full p-4 flex gap-3 hover:bg-gray-50 text-left',
        !notification.read && 'bg-primary-50'
      )}
    >
      <Icon name={icons[notification.type] || 'Bell'} className="flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {notification.title}
        </p>
        <p className="text-sm text-gray-500 truncate">
          {notification.message}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0" />
      )}
    </button>
  );
}
```

### 12.4 Real-Time Notifications (WebSocket)

```typescript
// hooks/useNotificationSocket.ts
export function useNotificationSocket() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const ws = new WebSocket(`${WS_URL}/notifications?token=${accessToken}`);

    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);

      // Add to notification list
      queryClient.setQueryData(
        ['notifications'],
        (old: Notification[] = []) => [notification, ...old]
      );

      // Show toast for important notifications
      if (notification.priority === 'HIGH') {
        toast.info(notification.title);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket error');
    };

    return () => ws.close();
  }, [accessToken]);
}
```

---

## 13. PRD Requirements Review (Task 1.5.12)

### 13.1 Module Coverage Matrix

| PRD Section | Module | Screens Defined | User Flows | Status |
|-------------|--------|-----------------|------------|--------|
| **2.0** | Mind Mapping | 5 screens | Mind map creation, task linking | ✅ Complete |
| **3.0** | Task Management | 8 screens | Task CRUD, Kanban, assignment | ✅ Complete |
| **4.0** | HR Management | 14 screens | Employee CRUD, attendance, leave | ✅ Complete |
| **5.0** | Training | 13 screens | Course management, exams, certs | ✅ Complete |
| **6.0** | Expense Management | 7 screens | Expense submission, approval | ✅ Complete |
| **7.0** | Complaints | 7 screens | Complaint logging, escalation | ✅ Complete |
| **8.0** | System Foundations | 5 screens | Auth, settings, audit | ✅ Complete |

### 13.2 PRD Feature Verification

#### Mind Mapping (PRD Section 2)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Mind map CRUD | 2.1 | ✅ | Mind Map List, Canvas |
| Node editing | 2.2 | ✅ | Node Detail Panel |
| Node types | 2.3 | ✅ | Node type selector |
| Visual markers | 2.4 | ✅ | Node styling options |
| Templates | 2.5 | ✅ | Template gallery |
| Zen Mode | 2.6 | ✅ | Toolbar toggle |

#### Task Management (PRD Section 3)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Independent tasks | 3.1 | ✅ | Task List, Create Form |
| Task from mind map | 3.2 | ✅ | Link Task modal |
| All attributes | 3.3 | ✅ | Task form fields |
| Status workflow | 3.4 | ✅ | Status badges, Kanban |
| Assignment | 3.5 | ✅ | User selector |
| Sub-tasks | 3.6 | ✅ | Sub-task list |
| Dependencies | 3.7 | ✅ | Dependency selector |
| Multiple views | 3.8 | ✅ | List, Kanban, Calendar |
| Comments/attachments | 3.9 | ✅ | Task Detail tabs |
| Notifications | 3.10 | ✅ | Toast, Notification Center |
| Reports | 3.11 | ✅ | Task Reports screen |

#### HR Management (PRD Section 4)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Position management | 4.1 | ✅ | Position Management screen |
| Org hierarchy | 4.2 | ✅ | Org Chart view |
| Candidate tracking | 4.3 | ✅ | Candidate List/Detail |
| Employee onboarding | 4.4 | ✅ | Employee Create form |
| Directory | 4.5 | ✅ | Employee Directory |
| Attendance | 4.6 | ✅ | Attendance Dashboard |
| Leave management | 4.7 | ✅ | Leave screens |
| Payroll reference | 4.8 | ✅ | Payroll References screen |

#### Training (PRD Section 5)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Course management | 5.1 | ✅ | Course Catalog, CRUD |
| Session scheduling | 5.2 | ✅ | Session Schedule |
| Trainer assignment | 5.3 | ✅ | Session form |
| Content delivery | 5.4 | ✅ | Course Detail content |
| Training attendance | 5.5 | ✅ | Training Attendance |
| Exams | 5.6 | ✅ | Exam Interface |
| Question bank | 5.7 | ✅ | Question Bank |
| Certificates | 5.8 | ✅ | Certificate View |
| Reports | 5.9 | ✅ | Training Reports |

#### Expense Management (PRD Section 6)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Expense creation | 6.1 | ✅ | Expense Create form |
| Document upload | 6.2 | ✅ | File uploader component |
| Multi-level approval | 6.3 | ✅ | Approval workflow flow |
| Status tracking | 6.4 | ✅ | Status badges |
| Payment processing | 6.5 | ✅ | Payment Processing screen |
| Reports | 6.6 | ✅ | Expense Reports |

#### Complaints (PRD Section 7)

| Feature | PRD Ref | UI Support | Screen/Component |
|---------|---------|------------|------------------|
| Complaint logging | 7.1 | ✅ | Complaint Create |
| Classification | 7.2 | ✅ | Severity/type selectors |
| Context linking | 7.3 | ✅ | Context fields |
| Assignment | 7.4 | ✅ | Owner assignment |
| Status tracking | 7.5 | ✅ | Status workflow |
| Action history | 7.6 | ✅ | Action Log |
| SLA tracking | 7.7 | ✅ | SLA Dashboard |
| Escalation | 7.8 | ✅ | Auto-escalation flow |
| Closure | 7.9 | ✅ | Close with remarks |

### 13.3 User Persona Validation

| Persona | Key Needs | UI Support |
|---------|-----------|------------|
| **Executive** | Dashboard overview, approvals | Dashboard, Approval queues |
| **Manager** | Team visibility, approvals | Team views, Approval workflows |
| **HR Admin** | Employee management | Full HR module access |
| **Finance Admin** | Expense processing | Expense module, payments |
| **Training Admin** | Course management | Training module admin views |
| **Employee** | Self-service, task work | My Tasks, Leave, Expenses |

### 13.4 Accessibility Verification

| Requirement | Status |
|-------------|--------|
| WCAG 2.1 Level AA | ✅ Defined in Section 7 |
| Keyboard navigation | ✅ Tab order, focus management |
| Screen reader support | ✅ ARIA labels, semantic HTML |
| Color contrast | ✅ 4.5:1 minimum ratios |
| Focus indicators | ✅ 2px primary outline |

---

## 14. Stakeholder Sign-Off (Task 1.5.13)

### 14.1 Review Process

| Phase | Participants | Outcome |
|-------|--------------|---------|
| **Draft Review** | Builder | Document created |
| **Technical Review** | Technical Lead | Architecture alignment |
| **Business Review** | Product Owner | PRD alignment |
| **Accessibility Review** | QA Lead | WCAG compliance |
| **Final Approval** | Product Owner | Document approved |

### 14.2 Feedback Incorporated

| Feedback Source | Feedback | Resolution |
|-----------------|----------|------------|
| [Pending] | [Pending] | [Pending] |

### 14.3 Change Control

Future UI changes must follow this process:

1. **Change Request**: Document requested change with rationale
2. **Impact Analysis**: Assess affected screens, components, patterns
3. **Design Update**: Update UI_UX_DESIGN.md
4. **Review**: Technical Lead + Product Owner approval
5. **Implementation**: Update frontend code
6. **Verification**: QA validation

---

## 15. Dependencies

### 15.1 Backend API Dependencies

| API Endpoint Group | UI Dependency |
|-------------------|---------------|
| `/auth/*` | Authentication screens |
| `/employees/*` | HR module screens |
| `/tasks/*` | Task module screens |
| `/mindmaps/*` | Mind map screens |
| `/training/*` | Training module screens |
| `/expenses/*` | Expense module screens |
| `/complaints/*` | Complaint module screens |
| `/notifications/*` | Notification center |
| `/storage/*` | File upload/download |

### 15.2 Infrastructure Dependencies

| Dependency | Purpose |
|------------|---------|
| Kong API Gateway | API routing, CORS |
| WebSocket endpoint | Real-time notifications |
| MinIO presigned URLs | File uploads/downloads |

### 15.3 Design Asset Dependencies

| Asset Type | Status |
|------------|--------|
| Lucide icons | Available (open source) |
| Inter font | Available (Google Fonts) |
| Tailwind CSS | Configured in tech stack |

---

## 16. Approval Record

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| Builder | AI (Claude) | CREATED | 2026-01-16 | Initial document creation |
| Product Owner | [Pending] | PENDING | - | Awaiting review |
| Technical Lead | [Pending] | PENDING | - | Awaiting review |

---

## Document Change Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-16 | AI (Claude) | Initial creation for Phase 1.5 Tasks 1.5.1-1.5.14 |

---

**END OF UI_UX_DESIGN.md**
