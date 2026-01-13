# MINDFLOW
## ULTRA-COMPREHENSIVE PRODUCT REQUIREMENTS DOCUMENT
*(Zero-Loss Deep Context Audit Version)*

---

# 1. PRODUCT OVERVIEW & ARCHITECTURAL FOUNDATIONS

## 1.1 Application Nature (LOCKED)

MindFlow is a **full-fledged, centralized, web-based application** designed for multi-user operation from day one.

- Browser-based primary interface
- Central backend (API + database)
- Role-based, authenticated access
- Real-time multi-user usage
- Designed to scale from **40-50 users to 70-80+ users**

There is **no offline-first or local-first assumption** anywhere in the system.

> **CLARIFICATION (User Override)**: Web-based is Phase 1. Mobile App planned for future phases.

---

## 1.2 Core Purpose

MindFlow is an **internal execution, governance, and operational control platform** that unifies:

- Thinking & planning (Mind Maps)
- Execution (Independent Task Management)
- Organizational structure (HR & hierarchy)
- Capability building (Training)
- Financial discipline (Expenses)
- Client quality control (Complaints)
- Oversight & safety (System Foundations)

into **one coherent system**, governed by hierarchy, approvals, SLAs, and auditability.

---

## 1.3 Non-Negotiable Design Principles (Explicitly Agreed)

1. **Modules are independent but integrated**
   - No module "owns" another
   - Cross-module links exist via references, not duplication

2. **Hierarchy is the backbone**
   - Task assignment
   - Approvals
   - Escalations
   - Visibility
   - All flow from HR hierarchy

3. **Execution > ornamentation**
   - No ERP bloat
   - No CRM
   - No performance appraisal system
   - No payroll automation
   - No gamification

4. **Auditability everywhere**
   - Nothing important happens silently
   - History is immutable

---

# 2. MIND MAPPING MODULE
*(Thinking, Planning & Structuring Module — NOT the execution owner)*

The Mind Mapping Module is a **cognitive and planning tool**.
It helps users think, structure, analyse, and plan, and can optionally generate executable tasks.

**It does not own execution.**

---

## 2.1 Mind Map Creation & Lifecycle

### Explanation
Users must be able to create unlimited mind maps to visually represent ideas, workflows, SOPs, claims processes, training structures, operational plans, or problem breakdowns. Mind maps are **long-living planning artifacts** and may be revisited, modified, or archived over time.

Mind maps are **not task containers by default**.

### How to Build
- Create a `MindMap` entity with:
  - id
  - title
  - description
  - created_by
  - created_at, updated_at
  - status (Active / Archived)
- Full CRUD APIs
- Archive must be soft (data retained)
- Ownership tied to organization, not individual

---

## 2.2 Node Creation, Editing & Re-structuring

### Explanation
Nodes represent individual ideas, activities, references, or planned actions. Users must be able to freely add, edit, move, reorder, and restructure nodes using drag-and-drop interactions.

The **visual layout is meaningful** and must be preserved.

### How to Build
- Create `MindMapNode` entity:
  - id
  - mind_map_id
  - parent_node_id
  - title
  - description
  - x_position, y_position
  - display_order
- Persist layout on every meaningful change
- Use a canvas/graph rendering library

---

## 2.3 Node Types (ZERO-LOSS, CORRECTED)

### Explanation
Each node must explicitly be one of the following types:

- **Idea**
- **Activity**
- **Reference / Note**
- **Linked Task**

A **Linked Task node does NOT contain task data**.
It only **references a Task** created in the Task Management module.

This decoupling was explicitly required to avoid data duplication and ownership confusion.

### How to Build
- Use `node_type` enum
- If `node_type = LINKED_TASK`:
  - store `task_id`
- Pull task summary dynamically from Task module
- **Deleting a node must NOT delete the task**

---

## 2.4 Visual Enhancements (Markers, Icons, Labels)

### Explanation
Nodes must support visual enrichment to improve cognition and scanning:

- Icons
- Color coding
- Labels / tags
- Priority markers
- Images and file attachments

These are functional cues, not decoration.

### How to Build
- Store visual metadata as structured fields (JSON)
- Render dynamically
- Allow future filtering by tags/icons

---

## 2.5 Templates & Custom Themes

### Explanation
Users should be able to start from predefined templates instead of blank canvases. Approved template types include:

- Claims workflow
- SOP mapping
- Training roadmap
- Daily / weekly planning

Users must also be able to save their own templates.

Themes control the **visual appearance**, not the structure.

### How to Build
- Store templates as predefined MindMap + Node sets
- Clone template on new map creation
- Theme metadata stored separately

---

## 2.6 Focus / Zen Mode

### Explanation
A distraction-free mode is required for deep thinking and planning. Zen Mode hides non-essential UI elements like sidebars, menus, and notifications.

This is a **UI-only feature**, explicitly approved as low-effort, high-value.

### How to Build
- UI toggle
- Conditional rendering
- No backend changes

---

# 3. TASK MANAGEMENT MODULE
*(Independent Execution & Work Management Module — FIRST-CLASS)*

## CRITICAL, LOCKED STATEMENT

**Task Management is a standalone module.**
**Tasks exist independently of Mind Maps.**
**Mind Maps are one of several task creation entry points.**

---

## 3.1 Independent Task Creation

### Explanation
Users must be able to create tasks directly from the Task Management module without involving mind maps. This is the **primary execution surface** for daily work.

### How to Build
- Create a dedicated `Task` entity
- Full CRUD APIs
- Tasks stored independently of Mind Maps

---

## 3.2 Task Creation via Mind Maps (Secondary Entry Point)

### Explanation
Users may convert a mind map node into a task. When this happens:

- A new task is created in Task Management
- The node becomes a **Linked Task**
- The task continues to exist even if the node is deleted

### How to Build
- On conversion:
  - Create Task
  - Store `task_id` in node
- One-way ownership: Task → Node reference only

---

## 3.3 Task Attributes (FULL, ZERO-LOSS SET)

### Explanation
Every task must support **all** of the following attributes (explicitly agreed):

- Title
- Description
- Assigned person(s)
- Expected Completion Date (ECD)
- Status
- Priority (Low / Medium / High / Critical)
- Labels / Tags
- Origin type:
  - Manual
  - Mind Map
  - Complaint
  - Training
  - Expense (future)

### How to Build
- Store attributes in Task table
- Use `origin_type` + `origin_id`
- Enforce validation at API level

---

## 3.4 Pre-Defined Task Statuses

### Explanation
Task statuses must be standardized and controlled.

Approved statuses:
- Not Started
- In Progress
- Waiting / Blocked
- Review Required
- Completed
- Dropped / Cancelled

**Free-text statuses are not allowed.**

### How to Build
- Enum-based status
- Status transition logging mandatory
- Enforce via backend validation

---

## 3.5 Task Assignment & Re-assignment

### Explanation
Tasks must be assignable to employees. Assignment and reassignment must be governed by:

- HR hierarchy
- Role permissions

All changes must be auditable.

### How to Build
- Link task to `employee_id(s)`
- Validate via RBAC
- Log assignment changes in audit logs

---

## 3.6 Sub-Tasks & Hierarchies

### Explanation
Tasks must support hierarchical breakdown into sub-tasks. This is essential for:

- Claims processing
- Multi-step operations
- Training execution

### How to Build
- `parent_task_id` referencing Task
- Prevent circular references
- Aggregate progress upward

---

## 3.7 Task Dependencies

### Explanation
Some tasks must only begin after others complete. Dependencies enforce process discipline.

### How to Build
- Create `TaskDependency` table
- Validate no circular dependencies
- Block invalid status transitions

---

## 3.8 Task Views (Multiple, Same Data)

### Explanation
Tasks must be viewable through multiple representations:

- List View
- Kanban Board
- Calendar View (ECD-based)
- Filtered Views (by assignee, status, priority)

Mind Maps only **reference** tasks.

### How to Build
- All views consume the same Task APIs
- No duplicate data stores

---

## 3.9 Task Collaboration

### Explanation
Tasks must support contextual collaboration:

- Comments
- Mentions
- File attachments

This replaces ad-hoc WhatsApp/email conversations.

### How to Build
- `Comment` entity linked to Task
- `Attachment` entity with file references
- Mention parsing and notifications

---

## 3.10 Task Notifications

### Explanation
In-app notifications must trigger for:

- Assignment
- Due date approaching
- Overdue tasks
- Status changes

External channels (email/WhatsApp) are future integrations.

### How to Build
- Notification table
- Event-driven triggers
- Configurable preferences later

---

## 3.11 Task Reporting

### Explanation
Managers need operational visibility.

Approved reports:
- Tasks by status
- Overdue tasks
- User workload
- Priority distribution

### How to Build
- Aggregate queries
- Filterable views
- Export capability

---

# 4. HR MANAGEMENT MODULE
*(Organizational Structure, People, Attendance, Leave, Payroll Reference)*

The HR Management Module is the **structural backbone** of MindFlow.
It defines **who exists in the organization, how they relate to each other, and how authority flows**.

**Every other module (Tasks, Expenses, Training, Complaints, Approvals, Escalations) depends on HR.**

---

## 4.1 Position Management

### Explanation
The system must allow creation and management of **organizational positions**, such as:

- Managing Director (MD)
- National Head
- Regional Manager
- Manager
- Team Lead
- Executive

Positions define **authority level**, not individuals. Employees occupy positions.

### How to Build
- Create `Position` entity:
  - id
  - position_name
  - level (integer, higher = more authority)
  - description
- Positions are organization-wide master data
- Prevent deletion if employees are mapped

---

## 4.2 Organizational Hierarchy (Reporting Structure)

### Explanation
MindFlow must support a **clear reporting hierarchy** defining:

- Who reports to whom
- Multi-level reporting (not just one level)

This hierarchy governs:
- Task assignment
- Approvals
- Escalations
- Visibility

### How to Build
- Extend `Position` with:
  - `parent_position_id`
- Or maintain separate `OrgHierarchy` mapping
- Enforce **single reporting line per position**
- Changes must be audited

---

## 4.3 Candidate / Interview Management (Basic)

### Explanation
The system must support **basic candidate tracking**, not a full ATS.

Stages explicitly approved:
- Applied
- Interviewed
- Selected
- Rejected

This exists to support onboarding, not recruitment analytics.

### How to Build
- Create `Candidate` entity:
  - name
  - contact details
  - applied_position_id
  - status
  - remarks
- Simple CRUD + status transitions
- No complex workflows

---

## 4.4 Employee Onboarding

### Explanation
When a candidate is selected, they must be **converted into an employee**.

Employee onboarding creates:
- Employee profile
- System access
- Position mapping
- Manager mapping

### How to Build
- Create `Employee` entity:
  - employee_id
  - name
  - email / login id
  - position_id
  - reporting_manager_id
  - date_of_joining
  - status (Active / Inactive / Exited)
- Conversion workflow from Candidate → Employee
- Trigger user account creation

---

## 4.5 Employee Directory

### Explanation
A centralized, searchable **employee directory** is required and used across:

- Task assignment
- Training enrollment
- Expense approval
- Complaint assignment

### How to Build
- Read-only directory view over Employee table
- Filters by:
  - Position
  - Department (future)
  - Status

---

## 4.6 Attendance Management (Simple)

### Explanation
The system must support **simple attendance tracking**.

Scope is intentionally limited:
- Present / Absent
- Per day
- No biometric
- No geo-fencing

### How to Build
- Create `Attendance` entity:
  - employee_id
  - date
  - status (Present / Absent)
- Allow self-marking or admin marking
- Manager-level visibility only

---

## 4.7 Leave Management (Simple)

### Explanation
Employees must be able to apply for leave.
Managers must be able to approve or reject leave.

No complex leave policies were requested.

### How to Build
- Create `LeaveRequest` entity:
  - employee_id
  - leave_type
  - from_date
  - to_date
  - reason
  - status
- Approval via hierarchy
- Basic leave balance tracking (integer counters)

---

## 4.8 Payroll (Reference Only)

### Explanation
**Payroll automation is explicitly out of scope.**
However, the system must store basic payroll reference data for records.

### How to Build
- Create `PayrollReference` entity:
  - employee_id
  - salary_components (basic, allowances, etc.)
  - payout_status
  - remarks
- No calculations
- No bank integration

---

# 5. TRAINING MANAGEMENT MODULE
*(Structured Learning + Classroom + Mandatory Exams)*

The Training Module ensures employees are **trained, assessed, and certified** for operational readiness.

**Training is mandatory, and exam at the end is compulsory.**

---

## 5.1 Training Course / Module Management

### Explanation
The system must support creation of **training courses/modules** with defined objectives.

Courses may be:
- Technical
- Process-based
- Compliance-related

### How to Build
- Create `TrainingModule` entity:
  - title
  - description
  - objective
  - duration
  - mandatory_flag

---

## 5.2 Training Scheduling & Calendar

### Explanation
Training may include **classroom sessions conducted by seniors**.

Sessions must be scheduled with:
- Date
- Time
- Location
- Trainer

### How to Build
- Create `TrainingSession` entity:
  - training_module_id
  - trainer_employee_id
  - date
  - time
  - location
- Calendar view for sessions

---

## 5.3 Trainer / Instructor Assignment

### Explanation
Each training session must have a **trainer (senior staff)** responsible for delivery.

### How to Build
- Trainer is an Employee with Trainer role
- Enforce visibility and accountability

---

## 5.4 Training Content Delivery

### Explanation
Digital training materials must supplement classroom training.

Supported content:
- PDF
- PPT
- Video links
- Reference links

### How to Build
- Attach content to `TrainingModule`
- Reuse document storage infrastructure

---

## 5.5 Attendance Tracking (Training)

### Explanation
Attendance must be tracked for classroom sessions.

### How to Build
- `TrainingAttendance` entity:
  - training_session_id
  - employee_id
  - status (Present / Absent)

---

## 5.6 Assessment / Exam Engine (Mandatory)

### Explanation
Each training module must end with an **online exam**.
**Passing the exam is mandatory for completion.**

### How to Build
- Create `Exam` entity linked to TrainingModule
- Time-bound exams
- Auto-submit on timeout

---

## 5.7 Question Bank

### Explanation
Questions must be reusable across exams.

Supported types:
- MCQ
- True / False
- Fill in the blanks

### How to Build
- Create `Question` entity
- Map questions to exams
- Randomization optional

---

## 5.8 Exam Results & Certification

### Explanation
Exam results must be stored permanently.
Employees who pass receive a **completion certificate**.

### How to Build
- `ExamAttempt` entity
- Pass / Fail logic
- Generate PDF certificates

---

## 5.9 Training Reports

### Explanation
Management must see:
- Completion rates
- Exam scores
- Attendance

### How to Build
- Aggregated queries
- Exportable reports

---

# 6. EXPENSE MANAGEMENT MODULE
*(Requests, Approvals, Payments, Audit)*

The Expense Module ensures **financial discipline and auditability**.

---

## 6.1 Expense Request Creation

### Explanation
Employees must be able to submit expense requests.

Fields include:
- Expense type
- Amount
- Description
- Date

### How to Build
- Create `Expense` entity
- Draft → Submitted lifecycle

---

## 6.2 Bill & Document Upload

### Explanation
Supporting documents are mandatory.

### How to Build
- Attach files to Expense
- Reuse document storage

---

## 6.3 Multi-Level Approval Workflow

### Explanation
Expense approvals follow:
1. Reporting Manager
2. Higher Manager (if applicable)
3. Finance

### How to Build
- Use generic approval engine
- Hierarchy-based routing

---

## 6.4 Expense Status Tracking

### Explanation
Approved statuses:
- Draft
- Submitted
- Manager Approved
- Finance Approved
- Paid
- Rejected

### How to Build
- Enum-based status
- Transition validation

---

## 6.5 Finance Payment Processing

### Explanation
Finance must record:
- Payment mode
- Reference number
- Payment date

### How to Build
- `ExpensePayment` entity
- Linked to Expense

---

## 6.6 Expense Reports & Audit

### Explanation
Reports include:
- Employee-wise
- Month-wise
- Pending approvals

### How to Build
- Aggregation queries
- CSV export

---

# 7. COMPLAINTS MANAGEMENT MODULE
*(Client Trust, SLA, Escalation)*

**Complaints are formal operational incidents, not notes.**

---

## 7.1 Complaint Logging

### Explanation
Complaints must be logged centrally.

Sources:
- Phone
- Internal staff
- Email / WhatsApp (future)

### How to Build
- Create `Complaint` entity
- Mandatory description, date, channel

---

## 7.2 Complaint Classification

### Explanation
Complaints must be classified by:
- Type
- Severity (Low / Medium / High / Critical)
- Client / Insurer

### How to Build
- Enum + master data

---

## 7.3 Context Linking

### Explanation
Complaints may be linked to:
- Claim number
- Vehicle
- Workshop
- Client

### How to Build
- Optional foreign keys / reference fields

---

## 7.4 Assignment & Ownership

### Explanation
Each complaint must have an owner.

### How to Build
- Assign to Employee
- Hierarchy-based escalation

---

## 7.5 Status Tracking

### Explanation
Approved statuses:
- New
- Assigned
- In Progress
- Waiting for Info
- Resolved
- Closed
- Reopened

### How to Build
- Enum-based workflow

---

## 7.6 Action History & Notes

### Explanation
All investigation steps must be recorded.

### How to Build
- Append-only action log per complaint

---

## 7.7 SLA & TAT Tracking

### Explanation
SLA based on severity.

### How to Build
- SLA rules
- Auto TAT calculation

---

## 7.8 Escalation Management

### Explanation
Automatic escalation on SLA breach.

### How to Build
- Scheduler + hierarchy lookup

---

## 7.9 Closure & Reopening

### Explanation
Closure requires remarks.

### How to Build
- Validation rules

---

## 7.10 Client Communication (Future)

### Explanation
Client must be informed on closure in future.

### How to Build
- Notification hooks only

---

# 8. SYSTEM FOUNDATIONS & NON-FUNCTIONAL REQUIREMENTS
*(MANDATORY)*

---

## 8.1 Authentication & Access

### Explanation
Secure login, session management, account lifecycle.

### How to Build
- Auth service
- Password hashing
- Session timeout

---

## 8.2 Role & Permission Matrix (RBAC)

### Explanation
Fine-grained permissions per module and action.

### How to Build
- Permission tables
- API-level enforcement

---

## 8.3 Data Ownership & Tenancy

### Explanation
All data owned by organization.

> **CLARIFICATION (User Override)**: Multi-tenant architecture with `tenant_id` on all entities and PostgreSQL Row-Level Security (RLS).

### How to Build
- `tenant_id` on all entities
- RLS policies for data isolation

---

## 8.4 Audit & Compliance

### Explanation
Immutable logs for all critical actions.

### How to Build
- Middleware-based audit logging

---

## 8.5 Backup & Recovery

### Explanation
Scheduled backups and restore.

### How to Build
- Automated backup jobs
- Admin restore controls

---

## 8.6 Error Handling & Exceptions

### Explanation
Graceful failures and logging.

### How to Build
- Central error handler
- Error logs

---

## 8.7 Configuration vs Hard-Coded Rules

### Explanation
Business rules must be configurable.

### How to Build
- Config tables
- Admin UI
- Audit config changes

---

*Document Status: FROZEN*
*Last Updated: 2026-01-12*
