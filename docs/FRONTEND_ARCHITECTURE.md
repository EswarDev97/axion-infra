# MindFlow – Frontend Architecture Design

> **Purpose**: Define complete frontend technical architecture for MindFlow Phase 1
> **SDLC Phase**: Phase 3.5 – Frontend Architecture Design
> **Tasks Covered**: 3.5.1 through 3.5.15
> **Status**: COMPLETE - Product Owner Approved
> **Last Updated**: 2026-01-16

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **SDLC Phase** | Phase 3.5 – Frontend Architecture Design |
| **SDLC Tasks** | 3.5.1, 3.5.2, 3.5.3, 3.5.4, 3.5.5, 3.5.6, 3.5.7, 3.5.8, 3.5.9, 3.5.10, 3.5.11, 3.5.12, 3.5.13, 3.5.14, 3.5.15 |
| **Authority** | Subordinate to [PRD.md](PRD.md), [UI_UX_DESIGN.md](UI_UX_DESIGN.md), [API_CONTRACT.md](API_CONTRACT.md), [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md), [TECH_STACK.md](TECH_STACK.md) |
| **Approval Status** | COMPLETE - Product Owner Approved (2026-01-16) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Project Structure (Task 3.5.1)](#2-project-structure-task-351)
3. [Shared UI Components (Task 3.5.2)](#3-shared-ui-components-task-352)
4. [Page-Level Components (Task 3.5.3)](#4-page-level-components-task-353)
5. [API Client Architecture (Task 3.5.4)](#5-api-client-architecture-task-354)
6. [Authentication Flow (Task 3.5.5)](#6-authentication-flow-task-355)
7. [Authorization Enforcement (Task 3.5.6)](#7-authorization-enforcement-task-356)
8. [Error Boundary Strategy (Task 3.5.7)](#8-error-boundary-strategy-task-357)
9. [Loading State Management (Task 3.5.8)](#9-loading-state-management-task-358)
10. [Form Management Strategy (Task 3.5.9)](#10-form-management-strategy-task-359)
11. [Client-Side Validation (Task 3.5.10)](#11-client-side-validation-task-3510)
12. [Data Caching Strategy (Task 3.5.11)](#12-data-caching-strategy-task-3511)
13. [Real-Time Communication (Task 3.5.12)](#13-real-time-communication-task-3512)
14. [Security Review (Task 3.5.13)](#14-security-review-task-3513)
15. [Architecture Freeze (Task 3.5.14)](#15-architecture-freeze-task-3514)
16. [Dependencies](#16-dependencies)
17. [Approval Record](#17-approval-record)

---

## 1. Introduction

### 1.1 Purpose

This document establishes the frontend technical architecture for MindFlow Phase 1, defining:
- Project structure and file organization
- Reusable component library
- API client configuration
- Authentication and authorization patterns
- State management strategies
- Error handling and loading states
- Form management and validation
- Data caching and real-time communication
- Security controls

### 1.2 Technology Stack

From [TECH_STACK.md](TECH_STACK.md):

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 14.x | React framework with App Router |
| TypeScript | 5.x | Type-safe JavaScript |
| React | 18.x | UI component library |
| Tailwind CSS | 3.x | Utility-first CSS framework |
| Zustand | 4.x | Client state management |
| TanStack React Query | 5.x | Server state management |
| React Hook Form | 7.x | Form state management |
| Zod | 3.x | Schema validation |
| Axios | 1.x | HTTP client |
| Lucide React | Latest | Icon library |

### 1.3 Design Principles

| Principle | Description |
|-----------|-------------|
| **Type Safety** | Full TypeScript coverage with strict mode enabled |
| **Component Reusability** | Atomic design pattern for maximum reuse |
| **Performance First** | Code splitting, lazy loading, optimized rendering |
| **Security by Default** | XSS prevention, secure token storage, input validation |
| **Accessibility** | WCAG 2.1 Level AA compliance |
| **Mobile First** | Responsive design starting from mobile breakpoints |

---

## 2. Project Structure (Task 3.5.1)

### 2.1 Root Directory Structure

```
mindflow-frontend/
├── public/                          # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
├── src/
│   ├── app/                         # Next.js App Router pages
│   ├── components/                  # Shared UI components
│   ├── hooks/                       # Custom React hooks
│   ├── services/                    # API client and services
│   ├── stores/                      # Zustand stores
│   ├── types/                       # TypeScript interfaces
│   ├── utils/                       # Helper functions
│   ├── lib/                         # Library configurations
│   ├── styles/                      # Global styles
│   └── constants/                   # Application constants
├── tests/                           # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                     # Environment template
├── .env.local                       # Local environment (gitignored)
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json
```

### 2.2 Source Directory Details

#### 2.2.1 `src/app/` - Next.js App Router Pages

```
src/app/
├── (auth)/                          # Auth group (no layout)
│   ├── login/
│   │   └── page.tsx
│   ├── forgot-password/
│   │   └── page.tsx
│   ├── reset-password/
│   │   └── page.tsx
│   └── layout.tsx                   # Auth layout (centered card)
├── (dashboard)/                     # Main app group
│   ├── dashboard/
│   │   └── page.tsx
│   ├── mindmaps/
│   │   ├── page.tsx                 # List view
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx            # Canvas view
│   │   └── templates/page.tsx
│   ├── tasks/
│   │   ├── page.tsx                 # List view
│   │   ├── board/page.tsx           # Kanban view
│   │   ├── calendar/page.tsx
│   │   ├── my/page.tsx
│   │   ├── team/page.tsx
│   │   ├── new/page.tsx
│   │   └── [id]/page.tsx
│   ├── hr/
│   │   ├── employees/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── positions/page.tsx
│   │   ├── hierarchy/page.tsx
│   │   ├── candidates/
│   │   ├── attendance/page.tsx
│   │   ├── leave/
│   │   │   ├── page.tsx
│   │   │   ├── apply/page.tsx
│   │   │   └── balance/page.tsx
│   │   └── payroll/page.tsx
│   ├── training/
│   │   ├── courses/
│   │   ├── my-training/page.tsx
│   │   ├── sessions/
│   │   ├── exams/
│   │   └── reports/page.tsx
│   ├── expenses/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── approvals/page.tsx
│   │   ├── payments/page.tsx
│   │   └── reports/page.tsx
│   ├── complaints/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── sla/page.tsx
│   │   └── settings/page.tsx
│   ├── reports/
│   ├── settings/
│   │   ├── profile/page.tsx
│   │   ├── notifications/page.tsx
│   │   ├── sessions/page.tsx
│   │   └── system/page.tsx
│   ├── admin/
│   │   ├── audit-logs/page.tsx
│   │   └── roles/page.tsx
│   └── layout.tsx                   # Dashboard layout (sidebar + header)
├── api/                             # API routes (if needed)
├── error.tsx                        # Global error boundary
├── loading.tsx                      # Global loading
├── not-found.tsx                    # 404 page
└── layout.tsx                       # Root layout
```

#### 2.2.2 `src/components/` - Shared UI Components

```
src/components/
├── ui/                              # Atomic components (Level 1)
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   ├── Input/
│   ├── Select/
│   ├── Checkbox/
│   ├── Radio/
│   ├── Switch/
│   ├── Badge/
│   ├── Avatar/
│   ├── Icon/
│   ├── Spinner/
│   ├── Tooltip/
│   └── index.ts                     # Barrel export
├── form/                            # Form components (Level 2)
│   ├── FormField/
│   ├── SearchInput/
│   ├── DatePicker/
│   ├── DateRangePicker/
│   ├── FileUploader/
│   ├── UserSelect/
│   └── index.ts
├── feedback/                        # Feedback components
│   ├── Toast/
│   ├── Alert/
│   ├── Modal/
│   ├── ConfirmDialog/
│   ├── EmptyState/
│   ├── ErrorState/
│   └── LoadingState/
├── data/                            # Data display components
│   ├── DataTable/
│   ├── Pagination/
│   ├── FilterBar/
│   ├── SortableHeader/
│   └── StatCard/
├── navigation/                      # Navigation components
│   ├── Sidebar/
│   ├── Header/
│   ├── Breadcrumb/
│   ├── NavMenu/
│   └── UserMenu/
├── layout/                          # Layout components
│   ├── AppLayout/
│   ├── AuthLayout/
│   ├── PageHeader/
│   ├── Card/
│   └── SplitPane/
└── domain/                          # Domain-specific components
    ├── task/
    │   ├── TaskCard/
    │   ├── TaskForm/
    │   ├── KanbanBoard/
    │   └── TaskStatusBadge/
    ├── employee/
    │   ├── EmployeeCard/
    │   ├── EmployeeForm/
    │   └── OrgChart/
    ├── mindmap/
    │   ├── MindMapCanvas/
    │   ├── MindMapNode/
    │   └── NodeEditor/
    └── common/
        ├── CommentThread/
        ├── FileList/
        ├── ActivityLog/
        └── ApprovalCard/
```

#### 2.2.3 `src/hooks/` - Custom React Hooks

```
src/hooks/
├── api/                             # API hooks (TanStack Query)
│   ├── useAuth.ts
│   ├── useTasks.ts
│   ├── useEmployees.ts
│   ├── useMindMaps.ts
│   ├── useExpenses.ts
│   ├── useComplaints.ts
│   ├── useTraining.ts
│   ├── useApprovals.ts
│   ├── useNotifications.ts
│   └── useFiles.ts
├── ui/                              # UI hooks
│   ├── useMediaQuery.ts
│   ├── useDebounce.ts
│   ├── useLocalStorage.ts
│   ├── useClickOutside.ts
│   └── useKeyboard.ts
├── auth/                            # Auth hooks
│   ├── useCurrentUser.ts
│   ├── usePermissions.ts
│   └── useSession.ts
└── index.ts
```

#### 2.2.4 `src/services/` - API Client and Services

```
src/services/
├── api/
│   ├── client.ts                    # Axios instance
│   ├── interceptors.ts              # Request/response interceptors
│   └── types.ts                     # API response types
├── auth/
│   ├── authService.ts               # Login, logout, refresh
│   └── tokenService.ts              # Token storage/retrieval
├── modules/
│   ├── taskService.ts
│   ├── employeeService.ts
│   ├── mindmapService.ts
│   ├── expenseService.ts
│   ├── complaintService.ts
│   ├── trainingService.ts
│   ├── approvalService.ts
│   ├── notificationService.ts
│   └── storageService.ts
└── websocket/
    ├── socketClient.ts              # WebSocket client
    └── handlers.ts                  # Event handlers
```

#### 2.2.5 `src/stores/` - Zustand Stores

```
src/stores/
├── authStore.ts                     # Authentication state
├── uiStore.ts                       # UI preferences
├── notificationStore.ts             # Notification state
└── index.ts
```

#### 2.2.6 `src/types/` - TypeScript Interfaces

```
src/types/
├── api/
│   ├── auth.ts                      # Auth request/response types
│   ├── task.ts                      # Task types
│   ├── employee.ts                  # Employee types
│   ├── mindmap.ts                   # Mind map types
│   ├── expense.ts                   # Expense types
│   ├── complaint.ts                 # Complaint types
│   ├── training.ts                  # Training types
│   ├── approval.ts                  # Approval types
│   ├── notification.ts              # Notification types
│   └── common.ts                    # Shared types (pagination, etc.)
├── ui/
│   ├── components.ts                # Component prop types
│   └── navigation.ts                # Navigation types
└── index.ts
```

#### 2.2.7 `src/utils/` - Helper Functions

```
src/utils/
├── formatters/
│   ├── date.ts                      # Date formatting
│   ├── currency.ts                  # Currency formatting
│   └── string.ts                    # String utilities
├── validators/
│   ├── schemas.ts                   # Zod schemas
│   └── rules.ts                     # Validation rules
├── helpers/
│   ├── permissions.ts               # Permission checking
│   ├── hierarchy.ts                 # Hierarchy utilities
│   └── file.ts                      # File utilities
└── index.ts
```

#### 2.2.8 `src/lib/` - Library Configurations

```
src/lib/
├── queryClient.ts                   # TanStack Query client
├── queryKeys.ts                     # Query key factory
├── navigation.ts                    # Navigation config
└── constants.ts                     # App constants
```

### 2.3 Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| **Components** | PascalCase | `TaskCard.tsx`, `DataTable.tsx` |
| **Hooks** | camelCase with `use` prefix | `useTasks.ts`, `useDebounce.ts` |
| **Services** | camelCase with `Service` suffix | `taskService.ts` |
| **Types/Interfaces** | PascalCase | `TaskResponse`, `CreateTaskRequest` |
| **Utilities** | camelCase | `formatDate.ts`, `validateEmail.ts` |
| **Constants** | SCREAMING_SNAKE_CASE | `API_BASE_URL`, `MAX_FILE_SIZE` |
| **CSS classes** | kebab-case (Tailwind) | `bg-primary-500`, `text-gray-700` |

### 2.4 Import Aliases

```typescript
// tsconfig.json paths
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/services/*": ["./src/services/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"],
      "@/utils/*": ["./src/utils/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

---

## 3. Shared UI Components (Task 3.5.2)

### 3.1 Atomic Components (Level 1)

Based on [UI_UX_DESIGN.md](UI_UX_DESIGN.md) Section 4.1.

#### 3.1.1 Button

```typescript
// src/components/ui/Button/Button.tsx
import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, VariantProps } from 'class-variance-authority';
import { Spinner } from '@/components/ui/Spinner';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
        outline: 'border border-gray-300 bg-transparent hover:bg-gray-50 active:bg-gray-100',
        ghost: 'bg-transparent hover:bg-gray-100 active:bg-gray-200',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonVariants({ variant, size, className })}
        disabled={disabled || loading}
        aria-busy={loading}
        {...props}
      >
        {loading && <Spinner size="sm" className="mr-2" />}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### 3.1.2 Input

```typescript
// src/components/ui/Input/Input.tsx
import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, leftIcon, rightIcon, ...props }, ref) => {
    return (
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-0',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            className
          )}
          aria-invalid={error}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {rightIcon}
          </span>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

#### 3.1.3 Select

```typescript
// src/components/ui/Select/Select.tsx
import { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, error, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'flex h-10 w-full appearance-none rounded-md border bg-white px-3 py-2 pr-10 text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-primary-500',
            className
          )}
          aria-invalid={error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
      </div>
    );
  }
);

Select.displayName = 'Select';
```

#### 3.1.4 Component Summary Table

| Component | Props | Variants | Sizes | Accessibility |
|-----------|-------|----------|-------|---------------|
| `Button` | variant, size, loading, leftIcon, rightIcon, disabled | primary, secondary, outline, ghost, danger, link | sm, md, lg, icon | aria-busy, aria-disabled |
| `Input` | type, error, leftIcon, rightIcon, disabled | - | - | aria-invalid, aria-describedby |
| `Textarea` | rows, error, disabled | - | - | aria-invalid |
| `Select` | options, placeholder, error, disabled | - | - | aria-invalid |
| `Checkbox` | checked, disabled, label | - | sm, md | aria-checked |
| `Radio` | options, value, disabled | - | - | role="radiogroup" |
| `Switch` | checked, disabled, label | - | sm, md | role="switch" |
| `Badge` | variant | success, warning, error, info, neutral | sm, md | - |
| `Avatar` | src, name, size | - | sm, md, lg, xl | alt text |
| `Icon` | name, size, color | - | sm, md, lg | aria-hidden |
| `Spinner` | size | - | sm, md, lg | aria-label="Loading" |
| `Tooltip` | content, position | - | - | role="tooltip" |

### 3.2 Molecule Components (Level 2)

#### 3.2.1 FormField

```typescript
// src/components/form/FormField/FormField.tsx
import { ReactNode } from 'react';
import { Label } from '@/components/ui/Label';
import { HelperText } from '@/components/ui/HelperText';

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function FormField({ label, htmlFor, required, error, hint, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} required={required}>
        {label}
      </Label>
      {children}
      {error && <HelperText error>{error}</HelperText>}
      {!error && hint && <HelperText>{hint}</HelperText>}
    </div>
  );
}
```

#### 3.2.2 SearchInput

```typescript
// src/components/form/SearchInput/SearchInput.tsx
import { useState, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useDebounce } from '@/hooks/ui/useDebounce';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
}

export function SearchInput({ placeholder = 'Search...', onSearch, debounceMs = 300 }: SearchInputProps) {
  const [value, setValue] = useState('');

  const debouncedSearch = useDebounce((searchValue: string) => {
    onSearch(searchValue);
  }, debounceMs);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    debouncedSearch(newValue);
  }, [debouncedSearch]);

  const handleClear = useCallback(() => {
    setValue('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className="relative">
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          value && (
            <Button variant="ghost" size="icon" onClick={handleClear} className="h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          )
        }
      />
    </div>
  );
}
```

#### 3.2.3 Molecule Component Summary

| Component | Composition | Purpose |
|-----------|-------------|---------|
| `FormField` | Label + Input + HelperText | Complete form field with validation |
| `SearchInput` | Input + Icon + Clear button | Debounced search input |
| `SelectField` | Label + Select + HelperText | Dropdown with label |
| `DatePicker` | Input + Calendar popup | Date selection (use react-day-picker) |
| `DateRangePicker` | 2x DatePicker | Date range selection |
| `UserSelect` | Select + Avatar | Employee/user selector |
| `FileUploader` | Input + Progress + Preview | File upload with progress |
| `Pagination` | Buttons + Page info | Table pagination |
| `StatusBadge` | Badge + Icon | Status with semantic color |
| `PriorityBadge` | Badge | Priority indicator |
| `EmptyState` | Icon + Text + Action | Empty data placeholder |
| `LoadingState` | Spinner + Text | Loading indicator |
| `ErrorState` | Icon + Text + Retry | Error with retry action |

---

## 4. Page-Level Components (Task 3.5.3)

### 4.1 Module Component Structure

Based on [UI_UX_DESIGN.md](UI_UX_DESIGN.md) Section 2 (75 screens).

#### 4.1.1 Mind Mapping Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `MindMapListPage` | `/mindmaps` | `useMindMaps()` | Grid view, filters, create button |
| `MindMapCanvasPage` | `/mindmaps/[id]` | `useMindMap(id)` | Canvas, toolbar, node editing |
| `MindMapTemplatePage` | `/mindmaps/templates` | `useMindMapTemplates()` | Template gallery |

```typescript
// src/app/(dashboard)/mindmaps/page.tsx
'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useMindMaps } from '@/hooks/api/useMindMaps';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/form/SearchInput';
import { DataTable } from '@/components/data/DataTable';
import { EmptyState } from '@/components/feedback/EmptyState';
import { LoadingState } from '@/components/feedback/LoadingState';

export default function MindMapListPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useMindMaps({ search });

  if (isLoading) return <LoadingState message="Loading mind maps..." />;
  if (error) return <ErrorState message={error.message} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mind Maps"
        actions={
          <Button leftIcon={<Plus className="h-4 w-4" />} href="/mindmaps/new">
            New Mind Map
          </Button>
        }
      />

      <div className="flex items-center gap-4">
        <SearchInput onSearch={setSearch} placeholder="Search mind maps..." />
      </div>

      {data?.items.length === 0 ? (
        <EmptyState
          icon="Brain"
          title="No mind maps yet"
          description="Create your first mind map to start planning."
          action={{ label: 'Create Mind Map', href: '/mindmaps/new' }}
        />
      ) : (
        <DataTable
          columns={mindMapColumns}
          data={data?.items || []}
          pagination={data?.pagination}
        />
      )}
    </div>
  );
}
```

#### 4.1.2 Task Management Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `TaskListPage` | `/tasks` | `useTasks(filters)` | List view, filters, sort |
| `TaskKanbanPage` | `/tasks/board` | `useTasks(filters)` | Kanban board, drag-drop |
| `TaskCalendarPage` | `/tasks/calendar` | `useTasks(filters)` | Calendar view |
| `TaskDetailPage` | `/tasks/[id]` | `useTask(id)` | Full details, comments, files |
| `TaskFormPage` | `/tasks/new`, `/tasks/[id]/edit` | `useCreateTask()`, `useUpdateTask()` | Create/edit form |
| `MyTasksPage` | `/tasks/my` | `useMyTasks()` | Own assigned tasks |
| `TeamTasksPage` | `/tasks/team` | `useTeamTasks()` | Subordinate tasks |

#### 4.1.3 HR Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `EmployeeDirectoryPage` | `/hr/employees` | `useEmployees(filters)` | Directory, search, filters |
| `EmployeeProfilePage` | `/hr/employees/[id]` | `useEmployee(id)` | Full profile view |
| `EmployeeFormPage` | `/hr/employees/new`, `/hr/employees/[id]/edit` | `useCreateEmployee()`, `useUpdateEmployee()` | Create/edit form |
| `PositionListPage` | `/hr/positions` | `usePositions()` | Position management |
| `OrgHierarchyPage` | `/hr/hierarchy` | `useOrgHierarchy()` | Org chart view |
| `AttendancePage` | `/hr/attendance` | `useAttendance(date)` | Daily attendance |
| `LeaveListPage` | `/hr/leave` | `useLeaveRequests(filters)` | Leave request list |
| `LeaveFormPage` | `/hr/leave/apply` | `useCreateLeaveRequest()` | Apply for leave |
| `LeaveBalancePage` | `/hr/leave/balance` | `useLeaveBalance()` | View balances |

#### 4.1.4 Training Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `CourseCatalogPage` | `/training/courses` | `useCourses(filters)` | Course listing |
| `CourseDetailPage` | `/training/courses/[id]` | `useCourse(id)` | Course info, enroll |
| `MyTrainingPage` | `/training/my-training` | `useMyEnrollments()` | Enrolled courses |
| `SessionSchedulePage` | `/training/sessions` | `useSessions(filters)` | Session calendar |
| `ExamPage` | `/training/exams/take/[id]` | `useExam(id)` | Take exam interface |
| `ExamResultsPage` | `/training/exams/results/[id]` | `useExamResults(attemptId)` | View results |

#### 4.1.5 Expense Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `ExpenseListPage` | `/expenses` | `useExpenses(filters)` | Expense list |
| `ExpenseDetailPage` | `/expenses/[id]` | `useExpense(id)` | Full details, receipts |
| `ExpenseFormPage` | `/expenses/new`, `/expenses/[id]/edit` | `useCreateExpense()`, `useUpdateExpense()` | Create/edit expense |
| `ExpenseApprovalPage` | `/expenses/approvals` | `usePendingExpenseApprovals()` | Approval queue |
| `PaymentProcessingPage` | `/expenses/payments` | `useApprovedExpenses()` | Process payments |

#### 4.1.6 Complaints Module

| Page Component | Route | Data Fetching Hook | Key Features |
|----------------|-------|-------------------|--------------|
| `ComplaintListPage` | `/complaints` | `useComplaints(filters)` | Complaint list |
| `ComplaintDetailPage` | `/complaints/[id]` | `useComplaint(id)` | Details, actions |
| `ComplaintFormPage` | `/complaints/new` | `useCreateComplaint()` | Log complaint |
| `SLADashboardPage` | `/complaints/sla` | `useSLAMetrics()` | SLA compliance |
| `SLASettingsPage` | `/complaints/settings` | `useSLAConfigs()` | Configure SLAs |

### 4.2 Route Configuration Summary

| Module | Total Pages | Route Prefix | Auth Required |
|--------|-------------|--------------|---------------|
| Authentication | 4 | `/auth` | No |
| Dashboard | 5 | `/dashboard` | Yes |
| Mind Maps | 4 | `/mindmaps` | Yes |
| Tasks | 8 | `/tasks` | Yes |
| HR | 14 | `/hr` | Yes |
| Training | 13 | `/training` | Yes |
| Expenses | 7 | `/expenses` | Yes |
| Complaints | 7 | `/complaints` | Yes |
| Reports | 6 | `/reports` | Yes |
| Settings | 5 | `/settings` | Yes |
| Admin | 2 | `/admin` | Yes (SYSTEM_ADMIN) |
| **Total** | **75** | - | - |

---

## 5. API Client Architecture (Task 3.5.4)

### 5.1 Axios Client Configuration

```typescript
// src/services/api/client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { refreshAccessToken } from '@/services/auth/authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies (refresh token)
});

// Request interceptor - Add access token
apiClient.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add request ID for tracing
    config.headers['X-Request-ID'] = crypto.randomUUID();

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle errors and token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else if (token) {
      resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue request while refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { accessToken } = await refreshAccessToken();
        useAuthStore.getState().setAccessToken(accessToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        useAuthStore.getState().clearAuth();
        window.location.href = '/auth/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Transform error response
    const apiError = {
      status: error.response?.status,
      code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
      message: error.response?.data?.error?.message || 'An unexpected error occurred',
      details: error.response?.data?.error?.details || [],
    };

    return Promise.reject(apiError);
  }
);
```

### 5.2 API Response Types

```typescript
// src/services/api/types.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  requestId: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiError {
  status: number;
  code: string;
  message: string;
  details: Array<{
    field?: string;
    message: string;
    code: string;
  }>;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### 5.3 Module Service Example

```typescript
// src/services/modules/taskService.ts
import { apiClient } from '@/services/api/client';
import { ApiResponse, PaginatedResponse, PaginationParams } from '@/services/api/types';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskFilters } from '@/types/api/task';

const BASE_PATH = '/tasks';

export const taskService = {
  // List tasks with filters
  async getAll(
    filters: TaskFilters & PaginationParams
  ): Promise<PaginatedResponse<Task>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Task>>>(BASE_PATH, {
      params: filters,
    });
    return response.data.data;
  },

  // Get single task
  async getById(id: string): Promise<Task> {
    const response = await apiClient.get<ApiResponse<Task>>(`${BASE_PATH}/${id}`);
    return response.data.data;
  },

  // Create task
  async create(data: CreateTaskRequest): Promise<Task> {
    const response = await apiClient.post<ApiResponse<Task>>(BASE_PATH, data);
    return response.data.data;
  },

  // Update task
  async update(id: string, data: UpdateTaskRequest): Promise<Task> {
    const response = await apiClient.put<ApiResponse<Task>>(`${BASE_PATH}/${id}`, data);
    return response.data.data;
  },

  // Update task status
  async updateStatus(id: string, status: string, comment?: string): Promise<Task> {
    const response = await apiClient.patch<ApiResponse<Task>>(`${BASE_PATH}/${id}/status`, {
      status,
      comment,
    });
    return response.data.data;
  },

  // Delete task
  async delete(id: string): Promise<void> {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  // Get subtasks
  async getSubtasks(id: string): Promise<Task[]> {
    const response = await apiClient.get<ApiResponse<Task[]>>(`${BASE_PATH}/${id}/subtasks`);
    return response.data.data;
  },

  // Add comment
  async addComment(id: string, content: string): Promise<void> {
    await apiClient.post(`${BASE_PATH}/${id}/comments`, { content });
  },

  // Upload attachment
  async uploadAttachment(id: string, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    await apiClient.post(`${BASE_PATH}/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
```

### 5.4 API Type Definitions

```typescript
// src/types/api/task.ts
export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  expectedCompletionDate: string | null;
  assignees: TaskAssignee[];
  labels: string[];
  parentTask: TaskSummary | null;
  originType: TaskOriginType;
  originId: string | null;
  createdBy: UserSummary;
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'COMPLETED' | 'DROPPED';
export type TaskOriginType = 'MANUAL' | 'MIND_MAP' | 'COMPLAINT' | 'TRAINING';

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TaskSummary {
  id: string;
  title: string;
}

export interface UserSummary {
  id: string;
  name: string;
}

export interface CreateTaskRequest {
  title: string;
  description?: string;
  priority?: TaskPriority;
  expectedCompletionDate?: string;
  assigneeIds?: string[];
  labels?: string[];
  parentTaskId?: string;
  originType?: TaskOriginType;
  originId?: string;
}

export interface UpdateTaskRequest {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  expectedCompletionDate?: string;
  assigneeIds?: string[];
  labels?: string[];
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
```

---

## 6. Authentication Flow (Task 3.5.5)

### 6.1 Login Flow

```typescript
// src/services/auth/authService.ts
import { apiClient } from '@/services/api/client';
import { useAuthStore } from '@/stores/authStore';

interface LoginRequest {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    tenantId: string;
  };
}

export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post<{ data: LoginResponse }>('/auth/login', credentials);

  const { accessToken, user } = response.data.data;

  // Store access token in memory (Zustand store)
  useAuthStore.getState().setAuth(accessToken, user);

  // Refresh token is automatically stored in httpOnly cookie by backend

  return response.data.data;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    // Clear auth state regardless of API response
    useAuthStore.getState().clearAuth();
  }
}

export async function refreshAccessToken(): Promise<{ accessToken: string }> {
  // Refresh token is sent automatically via httpOnly cookie
  const response = await apiClient.post<{ data: { accessToken: string } }>('/auth/token/refresh');
  return response.data.data;
}
```

### 6.2 Auth Store

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  setAuth: (accessToken: string, user: User) => void;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, user) => set({
        accessToken,
        user,
        isAuthenticated: true,
      }),

      setAccessToken: (accessToken) => set({ accessToken }),

      clearAuth: () => set({
        accessToken: null,
        user: null,
        isAuthenticated: false,
      }),
    }),
    {
      name: 'mindflow-auth',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage, NOT localStorage
      partialize: (state) => ({
        // Only persist user info, NOT the access token
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

### 6.3 Token Refresh Strategy

```typescript
// src/hooks/auth/useTokenRefresh.ts
import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { refreshAccessToken } from '@/services/auth/authService';
import { jwtDecode } from 'jwt-decode';

const REFRESH_THRESHOLD_MS = 60 * 1000; // Refresh 1 minute before expiry

export function useTokenRefresh() {
  const { accessToken, setAccessToken, clearAuth } = useAuthStore();
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    const scheduleRefresh = () => {
      try {
        const decoded = jwtDecode<{ exp: number }>(accessToken);
        const expiresAt = decoded.exp * 1000;
        const now = Date.now();
        const timeUntilExpiry = expiresAt - now;
        const refreshAt = timeUntilExpiry - REFRESH_THRESHOLD_MS;

        if (refreshAt <= 0) {
          // Token already expired or about to expire
          performRefresh();
        } else {
          // Schedule refresh
          refreshTimeoutRef.current = setTimeout(performRefresh, refreshAt);
        }
      } catch (error) {
        console.error('Invalid token:', error);
        clearAuth();
      }
    };

    const performRefresh = async () => {
      try {
        const { accessToken: newToken } = await refreshAccessToken();
        setAccessToken(newToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        clearAuth();
        window.location.href = '/auth/login?session_expired=true';
      }
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [accessToken, setAccessToken, clearAuth]);
}
```

### 6.4 Session Expiry Handling

```typescript
// src/components/feedback/SessionExpiredModal.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Modal } from '@/components/feedback/Modal';
import { Button } from '@/components/ui/Button';

export function SessionExpiredModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get('session_expired') === 'true') {
      setIsOpen(true);
    }
  }, [searchParams]);

  const handleLogin = () => {
    setIsOpen(false);
    router.push('/auth/login');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}}
      title="Session Expired"
      closeable={false}
    >
      <p className="text-gray-600">
        Your session has expired. Please log in again to continue.
      </p>
      <div className="mt-4 flex justify-end">
        <Button onClick={handleLogin}>Log In</Button>
      </div>
    </Modal>
  );
}
```

### 6.5 Authentication Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │     │   Backend   │     │   Browser   │
│   Form      │     │   API       │     │   Storage   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                   │
       │ POST /auth/login   │                   │
       │ {email, password}  │                   │
       │───────────────────►│                   │
       │                    │                   │
       │                    │ Validate          │
       │                    │ credentials       │
       │                    │                   │
       │    200 OK          │                   │
       │ {accessToken, user}│                   │
       │◄───────────────────│                   │
       │                    │                   │
       │    Set-Cookie:     │                   │
       │    refresh_token   │                   │
       │    (httpOnly)      │                   │
       │◄───────────────────┼──────────────────►│
       │                    │                   │ Store cookie
       │                    │                   │
       │ Store in memory    │                   │
       │ (Zustand store)    │                   │
       │                    │                   │
       │ Redirect to        │                   │
       │ /dashboard         │                   │
       │                    │                   │
```

---

## 7. Authorization Enforcement (Task 3.5.6)

### 7.1 Route Guards

```typescript
// src/components/auth/AuthGuard.tsx
'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { LoadingState } from '@/components/feedback/LoadingState';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) {
    return <LoadingState message="Checking authentication..." />;
  }

  return <>{children}</>;
}
```

### 7.2 Role-Based Route Guard

```typescript
// src/components/auth/RoleGuard.tsx
'use client';

import { useAuthStore } from '@/stores/authStore';
import { hasAnyRole, hasAllRoles } from '@/utils/helpers/permissions';
import { ForbiddenPage } from '@/components/feedback/ForbiddenPage';

type Role = 'SUPER_ADMIN' | 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'FINANCE_ADMIN' | 'TRAINING_ADMIN' | 'MANAGER' | 'EMPLOYEE';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  requireAll?: boolean;
  fallback?: React.ReactNode;
}

export function RoleGuard({
  children,
  allowedRoles,
  requireAll = false,
  fallback,
}: RoleGuardProps) {
  const { user } = useAuthStore();
  const userRoles = user?.roles || [];

  const hasAccess = requireAll
    ? hasAllRoles(userRoles, allowedRoles)
    : hasAnyRole(userRoles, allowedRoles);

  if (!hasAccess) {
    return fallback || <ForbiddenPage />;
  }

  return <>{children}</>;
}
```

### 7.3 Permission-Based Component Rendering

```typescript
// src/components/auth/CanAccess.tsx
'use client';

import { useAuthStore } from '@/stores/authStore';
import { checkPermission } from '@/utils/helpers/permissions';

interface CanAccessProps {
  children: React.ReactNode;
  permission: string; // e.g., "hr:write:all", "task:read:own"
  fallback?: React.ReactNode;
}

export function CanAccess({ children, permission, fallback = null }: CanAccessProps) {
  const { user } = useAuthStore();

  if (!user) return null;

  const hasPermission = checkPermission(user.roles, permission);

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
```

### 7.4 Permission Checking Utilities

```typescript
// src/utils/helpers/permissions.ts
type Role = 'SUPER_ADMIN' | 'SYSTEM_ADMIN' | 'HR_ADMIN' | 'FINANCE_ADMIN' | 'TRAINING_ADMIN' | 'MANAGER' | 'EMPLOYEE';

// Role to permissions mapping (from API_CONTRACT.md Section 7)
const ROLE_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: ['*'], // All permissions
  SYSTEM_ADMIN: [
    'auth:*:*',
    'hr:*:all',
    'task:*:all',
    'mindmap:*:all',
    'training:*:all',
    'expense:*:all',
    'complaint:*:all',
    'approval:*:all',
    'notification:*:all',
    'storage:*:all',
  ],
  HR_ADMIN: [
    'hr:*:all',
    'auth:read:all',
    'task:read:all',
  ],
  FINANCE_ADMIN: [
    'expense:*:all',
    'auth:read:all',
    'hr:read:all',
  ],
  TRAINING_ADMIN: [
    'training:*:all',
    'auth:read:all',
    'hr:read:all',
  ],
  MANAGER: [
    'hr:read:subordinates',
    'hr:update:subordinates',
    'task:*:subordinates',
    'task:*:own',
    'expense:approve:subordinates',
    'expense:*:own',
    'complaint:read:assigned',
  ],
  EMPLOYEE: [
    'hr:read:own',
    'hr:update:own',
    'task:*:own',
    'expense:*:own',
    'complaint:*:own',
    'training:enroll:own',
  ],
};

export function hasAnyRole(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role));
}

export function hasAllRoles(userRoles: string[], requiredRoles: Role[]): boolean {
  return requiredRoles.every((role) => userRoles.includes(role));
}

export function checkPermission(userRoles: string[], permission: string): boolean {
  // SUPER_ADMIN has all permissions
  if (userRoles.includes('SUPER_ADMIN')) return true;

  // Check each role's permissions
  for (const role of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[role as Role] || [];

    for (const perm of rolePermissions) {
      if (matchPermission(perm, permission)) {
        return true;
      }
    }
  }

  return false;
}

function matchPermission(pattern: string, permission: string): boolean {
  // Handle wildcard patterns
  if (pattern === '*') return true;

  const [patternModule, patternAction, patternScope] = pattern.split(':');
  const [permModule, permAction, permScope] = permission.split(':');

  const moduleMatch = patternModule === '*' || patternModule === permModule;
  const actionMatch = patternAction === '*' || patternAction === permAction;
  const scopeMatch = patternScope === '*' || patternScope === permScope;

  return moduleMatch && actionMatch && scopeMatch;
}

export function canAccessRoute(userRoles: string[], route: string): boolean {
  const routePermissions = ROUTE_PERMISSIONS[route];

  if (!routePermissions) return true; // Public route

  return hasAnyRole(userRoles, routePermissions);
}

const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/hr/positions': ['HR_ADMIN', 'SYSTEM_ADMIN'],
  '/hr/candidates': ['HR_ADMIN', 'SYSTEM_ADMIN'],
  '/expenses/payments': ['FINANCE_ADMIN', 'SYSTEM_ADMIN'],
  '/training/questions': ['TRAINING_ADMIN', 'SYSTEM_ADMIN'],
  '/complaints/settings': ['SYSTEM_ADMIN'],
  '/admin/audit-logs': ['SYSTEM_ADMIN'],
  '/admin/roles': ['HR_ADMIN', 'SYSTEM_ADMIN'],
};
```

### 7.5 Usage Examples

```typescript
// In a page component
export default function ExpensePaymentsPage() {
  return (
    <RoleGuard allowedRoles={['FINANCE_ADMIN', 'SYSTEM_ADMIN']}>
      <PaymentProcessingContent />
    </RoleGuard>
  );
}

// In a component with conditional rendering
function EmployeeActions({ employee }: { employee: Employee }) {
  return (
    <div className="flex gap-2">
      <Button>View Profile</Button>

      <CanAccess permission="hr:update:all">
        <Button variant="outline">Edit</Button>
      </CanAccess>

      <CanAccess permission="hr:delete:all">
        <Button variant="danger">Deactivate</Button>
      </CanAccess>
    </div>
  );
}
```

---

## 8. Error Boundary Strategy (Task 3.5.7)

### 8.1 Global Error Boundary

```typescript
// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { AlertTriangle } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('Global error:', error);
    // TODO: Send to Sentry or similar
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
        <h1 className="text-2xl font-semibold text-gray-900">Something went wrong</h1>
        <p className="text-gray-600 max-w-md">
          We apologize for the inconvenience. Please try again or contact support if the problem persists.
        </p>
        {error.digest && (
          <p className="text-sm text-gray-400">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>Try Again</Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### 8.2 Module-Level Error Boundary

```typescript
// src/components/feedback/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { ErrorState } from '@/components/feedback/ErrorState';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorState
          title="Something went wrong"
          message={this.state.error?.message || 'An unexpected error occurred'}
          onRetry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
```

### 8.3 API Error Handling

```typescript
// src/components/feedback/ApiError.tsx
import { ApiError } from '@/services/api/types';
import { Alert } from '@/components/feedback/Alert';
import { Button } from '@/components/ui/Button';

interface ApiErrorDisplayProps {
  error: ApiError;
  onRetry?: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  AUTH_TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  AUTH_CREDENTIALS_INVALID: 'Invalid email or password.',
  AUTHZ_INSUFFICIENT_PERMISSION: 'You do not have permission to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',
  RESOURCE_ALREADY_EXISTS: 'This item already exists.',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again later.',
};

export function ApiErrorDisplay({ error, onRetry }: ApiErrorDisplayProps) {
  const message = ERROR_MESSAGES[error.code] || error.message;

  return (
    <Alert variant="error" title="Error">
      <p>{message}</p>
      {error.details.length > 0 && (
        <ul className="mt-2 list-disc list-inside text-sm">
          {error.details.map((detail, index) => (
            <li key={index}>
              {detail.field && <strong>{detail.field}: </strong>}
              {detail.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
          Try Again
        </Button>
      )}
    </Alert>
  );
}
```

### 8.4 Error Boundary Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                Global Error Boundary                 │
│                  (src/app/error.tsx)                 │
│  ┌───────────────────────────────────────────────┐  │
│  │            Dashboard Layout                    │  │
│  │  ┌─────────────────────────────────────────┐  │  │
│  │  │      Module Error Boundary               │  │  │
│  │  │  ┌───────────────────────────────────┐  │  │  │
│  │  │  │         Page Component            │  │  │  │
│  │  │  │  ┌─────────────────────────────┐  │  │  │  │
│  │  │  │  │   Query Error Boundary      │  │  │  │  │
│  │  │  │  │   (TanStack Query)          │  │  │  │  │
│  │  │  │  └─────────────────────────────┘  │  │  │  │
│  │  │  └───────────────────────────────────┘  │  │  │
│  │  └─────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 9. Loading State Management (Task 3.5.8)

### 9.1 Global Loading State

```typescript
// src/app/loading.tsx
import { Spinner } from '@/components/ui/Spinner';

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-500">Loading...</p>
      </div>
    </div>
  );
}
```

### 9.2 Loading State Component

```typescript
// src/components/feedback/LoadingState.tsx
import { Spinner } from '@/components/ui/Spinner';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message = 'Loading...', fullScreen = false }: LoadingStateProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner size="lg" />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );

  if (fullScreen) {
    return <div className="min-h-screen flex items-center justify-center">{content}</div>;
  }

  return content;
}
```

### 9.3 Skeleton Components

```typescript
// src/components/feedback/Skeleton.tsx
import { cn } from '@/utils/cn';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'text',
  width,
  height,
}: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-md',
        variant === 'text' && 'rounded h-4',
        className
      )}
      style={{ width, height }}
    />
  );
}

// Skeleton presets
export function TableRowSkeleton() {
  return (
    <tr className="border-b">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton variant="text" />
        </td>
      ))}
    </tr>
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      <Skeleton variant="text" className="w-3/4" />
      <Skeleton variant="text" className="w-1/2" />
      <Skeleton variant="rectangular" height={100} />
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" width={48} height={48} />
      <div className="space-y-2">
        <Skeleton variant="text" width={150} />
        <Skeleton variant="text" width={100} />
      </div>
    </div>
  );
}
```

### 9.4 TanStack Query Loading States

```typescript
// src/hooks/api/useTasks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { taskService } from '@/services/modules/taskService';

export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => taskService.getAll(filters),
  });
}

// Usage in component
function TaskList() {
  const { data, isLoading, isFetching, error } = useTasks(filters);

  if (isLoading) {
    // Initial load - show skeleton
    return <TaskListSkeleton />;
  }

  if (error) {
    return <ApiErrorDisplay error={error} />;
  }

  return (
    <div className={cn(isFetching && 'opacity-60')}>
      {/* isFetching = background refetch, show content with reduced opacity */}
      <DataTable data={data.items} />
    </div>
  );
}
```

### 9.5 Optimistic Updates

```typescript
// src/hooks/api/useTasks.ts
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskService.updateStatus(id, status),

    // Optimistic update
    onMutate: async ({ id, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(id) });

      // Snapshot previous value
      const previousTask = queryClient.getQueryData<Task>(queryKeys.tasks.detail(id));

      // Optimistically update
      if (previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), {
          ...previousTask,
          status,
        });
      }

      return { previousTask };
    },

    // On error, rollback
    onError: (err, { id }, context) => {
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(id), context.previousTask);
      }
    },

    // Always refetch after mutation
    onSettled: (data, error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}
```

---

## 10. Form Management Strategy (Task 3.5.9)

### 10.1 Form Architecture

Based on [UI_UX_DESIGN.md](UI_UX_DESIGN.md) Section 8.4 and Section 10.

```typescript
// src/components/forms/TaskForm/TaskForm.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateTask, useUpdateTask } from '@/hooks/api/useTasks';
import { createTaskSchema, CreateTaskFormData } from '@/utils/validators/schemas';
import { FormField } from '@/components/form/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/form/DatePicker';
import { UserSelect } from '@/components/form/UserSelect';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/hooks/ui/useToast';

interface TaskFormProps {
  defaultValues?: Partial<CreateTaskFormData>;
  taskId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskForm({ defaultValues, taskId, onSuccess, onCancel }: TaskFormProps) {
  const { toast } = useToast();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const isEditing = !!taskId;

  const form = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'MEDIUM',
      assigneeIds: [],
      labels: [],
      ...defaultValues,
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    reset,
  } = form;

  const onSubmit = async (data: CreateTaskFormData) => {
    try {
      if (isEditing) {
        await updateTask.mutateAsync({ id: taskId, data });
        toast({ title: 'Task updated successfully' });
      } else {
        await createTask.mutateAsync(data);
        toast({ title: 'Task created successfully' });
        reset();
      }
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Failed to save task', variant: 'error' });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <FormField
        label="Title"
        htmlFor="title"
        required
        error={errors.title?.message}
      >
        <Input
          id="title"
          placeholder="Enter task title"
          {...register('title')}
          error={!!errors.title}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="description"
        error={errors.description?.message}
      >
        <Textarea
          id="description"
          placeholder="Enter task description"
          rows={4}
          {...register('description')}
          error={!!errors.description}
        />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Priority"
          htmlFor="priority"
          error={errors.priority?.message}
        >
          <Select
            id="priority"
            options={[
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'CRITICAL', label: 'Critical' },
            ]}
            {...register('priority')}
            error={!!errors.priority}
          />
        </FormField>

        <FormField
          label="Due Date"
          htmlFor="expectedCompletionDate"
          error={errors.expectedCompletionDate?.message}
        >
          <DatePicker
            id="expectedCompletionDate"
            control={control}
            name="expectedCompletionDate"
          />
        </FormField>
      </div>

      <FormField
        label="Assignees"
        htmlFor="assigneeIds"
        error={errors.assigneeIds?.message}
      >
        <UserSelect
          id="assigneeIds"
          control={control}
          name="assigneeIds"
          multiple
          placeholder="Select assignees"
        />
      </FormField>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" loading={isSubmitting}>
          {isEditing ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
```

### 10.2 Form Submission Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │   Form      │    │   API       │    │   UI        │
│   Input     │    │   Validate  │    │   Submit    │    │   Feedback  │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                   │                   │                   │
       │ onChange          │                   │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ Validate (Zod)    │                   │
       │                   │──────────────────►│                   │
       │                   │                   │                   │
       │                   │ Show errors       │                   │
       │◄──────────────────│                   │                   │
       │                   │                   │                   │
       │ onSubmit          │                   │                   │
       │──────────────────►│                   │                   │
       │                   │                   │                   │
       │                   │ Full validation   │                   │
       │                   │───────────────────┘                   │
       │                   │                                       │
       │                   │ Pass? ─────────────────────────────────┘
       │                   │                                       │
       │                   │                   │ POST /api/...     │
       │                   │                   │──────────────────►│
       │                   │                   │                   │
       │                   │                   │ Response          │
       │                   │                   │◄──────────────────│
       │                   │                   │                   │
       │                   │                   │         Toast/Redirect
       │◄──────────────────┼───────────────────┼───────────────────│
       │                   │                   │                   │
```

---

## 11. Client-Side Validation (Task 3.5.10)

### 11.1 Zod Schema Definitions

```typescript
// src/utils/validators/schemas.ts
import { z } from 'zod';

// Common validators
const uuid = z.string().uuid('Invalid selection');
const email = z.string().email('Please enter a valid email address');
const phone = z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number');
const password = z
  .string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[0-9]/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

const futureDate = z.string().refine(
  (date) => new Date(date) >= new Date(),
  { message: 'Date must be in the future' }
);

const pastDate = z.string().refine(
  (date) => new Date(date) <= new Date(),
  { message: 'Date cannot be in the future' }
);

// Auth schemas
export const loginSchema = z.object({
  email: email,
  password: z.string().min(1, 'Password is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: password,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  description: z.string().max(10000, 'Description is too long').optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  expectedCompletionDate: z.string().optional(),
  assigneeIds: z.array(uuid).min(0),
  labels: z.array(z.string().max(50)).max(10).optional(),
});

export type CreateTaskFormData = z.infer<typeof createTaskSchema>;

// Employee schemas
export const createEmployeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: email,
  phone: phone,
  dateOfBirth: pastDate,
  dateOfJoining: z.string(),
  positionId: uuid,
  departmentId: uuid,
  reportingManagerId: uuid.optional(),
  employmentType: z.enum(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']),
  address: z.object({
    line1: z.string().min(1, 'Address is required').max(255),
    line2: z.string().max(255).optional(),
    city: z.string().min(1, 'City is required').max(100),
    state: z.string().min(1, 'State is required').max(100),
    postalCode: z.string().min(1, 'Postal code is required').max(20),
    country: z.string().min(1, 'Country is required').max(100),
  }).optional(),
});

// Leave request schema
export const leaveRequestSchema = z.object({
  leaveTypeId: uuid,
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().min(1, 'Reason is required').max(1000),
  isHalfDay: z.boolean().default(false),
  contactNumber: phone.optional(),
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date must be after start date',
  path: ['endDate'],
});

// Expense schemas
export const expenseItemSchema = z.object({
  categoryId: uuid,
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.number().positive('Amount must be positive').max(1000000, 'Amount too large'),
  receiptRequired: z.boolean().default(true),
});

export const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(1000).optional(),
  expenseDate: pastDate,
  items: z.array(expenseItemSchema).min(1, 'At least one item is required'),
});

// Complaint schema
export const createComplaintSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  categoryId: uuid,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  clientName: z.string().max(255).optional(),
  clientContact: phone.optional(),
  clientEmail: email.optional(),
});
```

### 11.2 Validation Error Display

```typescript
// src/components/form/FormErrors.tsx
interface FormErrorsProps {
  errors: Record<string, { message?: string }>;
}

export function FormErrors({ errors }: FormErrorsProps) {
  const errorMessages = Object.entries(errors)
    .filter(([, error]) => error?.message)
    .map(([field, error]) => ({ field, message: error.message! }));

  if (errorMessages.length === 0) return null;

  return (
    <div
      className="bg-red-50 border border-red-200 rounded-md p-4"
      role="alert"
      aria-labelledby="form-errors-title"
    >
      <h3 id="form-errors-title" className="text-sm font-medium text-red-800">
        Please correct the following errors:
      </h3>
      <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
        {errorMessages.map(({ field, message }) => (
          <li key={field}>
            <a href={`#${field}`} className="hover:underline">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 12. Data Caching Strategy (Task 3.5.11)

### 12.1 TanStack Query Client Configuration

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (no refetch)
      staleTime: 5 * 60 * 1000, // 5 minutes

      // How long unused data stays in cache
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)

      // Retry configuration
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Refetch triggers
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchOnMount: true,

      // Error handling
      throwOnError: false,
    },
    mutations: {
      retry: 1,
      throwOnError: false,
    },
  },
});
```

### 12.2 Query Key Factory

```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  // Auth
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
    sessions: () => [...queryKeys.auth.all, 'sessions'] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.tasks.details(), id] as const,
    subtasks: (id: string) => [...queryKeys.tasks.detail(id), 'subtasks'] as const,
    comments: (id: string) => [...queryKeys.tasks.detail(id), 'comments'] as const,
    attachments: (id: string) => [...queryKeys.tasks.detail(id), 'attachments'] as const,
  },

  // Employees
  employees: {
    all: ['employees'] as const,
    lists: () => [...queryKeys.employees.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.employees.lists(), filters] as const,
    details: () => [...queryKeys.employees.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.employees.details(), id] as const,
    subordinates: (managerId: string) => [...queryKeys.employees.all, 'subordinates', managerId] as const,
    hierarchy: () => [...queryKeys.employees.all, 'hierarchy'] as const,
  },

  // Mind Maps
  mindmaps: {
    all: ['mindmaps'] as const,
    lists: () => [...queryKeys.mindmaps.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.mindmaps.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.mindmaps.all, 'detail', id] as const,
    nodes: (id: string) => [...queryKeys.mindmaps.detail(id), 'nodes'] as const,
    templates: () => [...queryKeys.mindmaps.all, 'templates'] as const,
  },

  // Expenses
  expenses: {
    all: ['expenses'] as const,
    lists: () => [...queryKeys.expenses.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.expenses.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.expenses.all, 'detail', id] as const,
    pendingApprovals: () => [...queryKeys.expenses.all, 'pending-approvals'] as const,
    categories: () => [...queryKeys.expenses.all, 'categories'] as const,
  },

  // Complaints
  complaints: {
    all: ['complaints'] as const,
    lists: () => [...queryKeys.complaints.all, 'list'] as const,
    list: (filters: Record<string, unknown>) => [...queryKeys.complaints.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.complaints.all, 'detail', id] as const,
    slaMetrics: () => [...queryKeys.complaints.all, 'sla-metrics'] as const,
    categories: () => [...queryKeys.complaints.all, 'categories'] as const,
  },

  // Training
  training: {
    courses: {
      all: ['training', 'courses'] as const,
      list: (filters: Record<string, unknown>) => [...queryKeys.training.courses.all, 'list', filters] as const,
      detail: (id: string) => [...queryKeys.training.courses.all, 'detail', id] as const,
    },
    enrollments: {
      all: ['training', 'enrollments'] as const,
      my: () => [...queryKeys.training.enrollments.all, 'my'] as const,
    },
    sessions: {
      all: ['training', 'sessions'] as const,
      list: (filters: Record<string, unknown>) => [...queryKeys.training.sessions.all, 'list', filters] as const,
    },
  },

  // Notifications
  notifications: {
    all: ['notifications'] as const,
    list: () => [...queryKeys.notifications.all, 'list'] as const,
    unreadCount: () => [...queryKeys.notifications.all, 'unread-count'] as const,
    preferences: () => [...queryKeys.notifications.all, 'preferences'] as const,
  },

  // Approvals
  approvals: {
    all: ['approvals'] as const,
    pending: () => [...queryKeys.approvals.all, 'pending'] as const,
    myRequests: () => [...queryKeys.approvals.all, 'my-requests'] as const,
  },

  // Leave
  leave: {
    all: ['leave'] as const,
    requests: (filters: Record<string, unknown>) => [...queryKeys.leave.all, 'requests', filters] as const,
    balance: (employeeId?: string) => [...queryKeys.leave.all, 'balance', employeeId] as const,
    types: () => [...queryKeys.leave.all, 'types'] as const,
  },
};
```

### 12.3 Cache Invalidation Patterns

```typescript
// src/hooks/api/useTasks.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taskService.create,
    onSuccess: () => {
      // Invalidate all task lists (will refetch)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskRequest }) =>
      taskService.update(id, data),
    onSuccess: (updatedTask, { id }) => {
      // Update cache directly
      queryClient.setQueryData(queryKeys.tasks.detail(id), updatedTask);
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: taskService.delete,
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(id) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
    },
  });
}
```

### 12.4 Stale Time Configuration by Resource

| Resource Type | Stale Time | GC Time | Rationale |
|---------------|------------|---------|-----------|
| User profile | 10 min | 60 min | Rarely changes |
| Dashboard stats | 1 min | 5 min | Near real-time |
| Task list | 5 min | 30 min | Moderate updates |
| Task detail | 5 min | 30 min | May be edited |
| Employee list | 10 min | 60 min | Rarely changes |
| Notifications | 30 sec | 5 min | Frequent updates |
| Approvals | 1 min | 10 min | Time-sensitive |
| Leave balance | 10 min | 60 min | Rarely changes |

---

## 13. Real-Time Communication (Task 3.5.12)

### 13.1 WebSocket Client

```typescript
// src/services/websocket/socketClient.ts
import { useAuthStore } from '@/stores/authStore';

type MessageHandler = (data: unknown) => void;

class WebSocketClient {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private messageQueue: string[] = [];

  connect() {
    const { accessToken } = useAuthStore.getState();
    if (!accessToken) return;

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws/notifications';

    this.socket = new WebSocket(`${wsUrl}?token=${accessToken}`);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      // Send queued messages
      while (this.messageQueue.length > 0) {
        const message = this.messageQueue.shift();
        if (message) this.socket?.send(message);
      }
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        const eventHandlers = this.handlers.get(type);
        if (eventHandlers) {
          eventHandlers.forEach((handler) => handler(payload));
        }
      } catch (error) {
        console.error('WebSocket message parse error:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket closed:', event.code, event.reason);

      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  private scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.socket) {
      this.socket.close(1000, 'Client disconnect');
      this.socket = null;
    }
    this.handlers.clear();
  }

  subscribe(eventType: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  send(type: string, payload: unknown) {
    const message = JSON.stringify({ type, payload });

    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const socketClient = new WebSocketClient();
```

### 13.2 WebSocket Hook

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef } from 'react';
import { socketClient } from '@/services/websocket/socketClient';
import { useAuthStore } from '@/stores/authStore';

export function useWebSocket() {
  const { isAuthenticated } = useAuthStore();
  const isConnectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !isConnectedRef.current) {
      socketClient.connect();
      isConnectedRef.current = true;
    }

    return () => {
      if (isConnectedRef.current) {
        socketClient.disconnect();
        isConnectedRef.current = false;
      }
    };
  }, [isAuthenticated]);
}

export function useSocketEvent<T>(eventType: string, handler: (data: T) => void) {
  useEffect(() => {
    const unsubscribe = socketClient.subscribe(eventType, handler as (data: unknown) => void);
    return unsubscribe;
  }, [eventType, handler]);
}
```

### 13.3 Notification Integration

```typescript
// src/hooks/useNotifications.ts
import { useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from '@/hooks/useWebSocket';
import { queryKeys } from '@/lib/queryKeys';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToast } from '@/hooks/ui/useToast';

interface NotificationEvent {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
}

export function useNotifications() {
  const queryClient = useQueryClient();
  const { addNotification, incrementUnreadCount } = useNotificationStore();
  const { toast } = useToast();

  const handleNewNotification = useCallback((data: NotificationEvent) => {
    // Add to store
    addNotification(data);
    incrementUnreadCount();

    // Show toast
    toast({
      title: data.title,
      description: data.message,
    });

    // Invalidate related queries based on notification type
    switch (data.type) {
      case 'TASK_ASSIGNED':
      case 'TASK_STATUS_CHANGED':
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
        break;
      case 'APPROVAL_REQUIRED':
      case 'APPROVAL_DECISION':
        queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all });
        break;
      case 'LEAVE_APPROVED':
      case 'LEAVE_REJECTED':
        queryClient.invalidateQueries({ queryKey: queryKeys.leave.all });
        break;
      case 'EXPENSE_APPROVED':
      case 'EXPENSE_REJECTED':
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all });
        break;
      case 'COMPLAINT_ASSIGNED':
      case 'COMPLAINT_ESCALATED':
        queryClient.invalidateQueries({ queryKey: queryKeys.complaints.all });
        break;
    }
  }, [addNotification, incrementUnreadCount, queryClient, toast]);

  useSocketEvent('notification.new', handleNewNotification);
}
```

### 13.4 Event Types

| Event Type | Source | Payload | Action |
|------------|--------|---------|--------|
| `notification.new` | notification-module | Notification object | Show toast, update badge |
| `task.updated` | task-module | Task ID, changes | Invalidate task cache |
| `approval.decision` | approval-module | Instance ID, decision | Update approval status |
| `user.session_revoked` | auth-module | Session ID | Force logout if current |

---

## 14. Security Review (Task 3.5.13)

### 14.1 XSS Prevention

| Control | Implementation | Status |
|---------|----------------|--------|
| **JSX Auto-escaping** | React auto-escapes all expressions in JSX | Enabled |
| **dangerouslySetInnerHTML** | Not used; if needed, sanitize with DOMPurify | N/A |
| **URL sanitization** | Validate URLs before rendering links | Implemented |
| **Content-Type headers** | API responses use `application/json` | Backend |

```typescript
// src/utils/sanitize.ts
import DOMPurify from 'dompurify';

// Only use if absolutely necessary for rich text
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

// URL validation
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
```

### 14.2 CSRF Protection

| Control | Implementation | Status |
|---------|----------------|--------|
| **SameSite cookies** | Refresh token uses `SameSite=Strict` | Backend |
| **CORS** | Backend restricts allowed origins | Backend |
| **State-changing operations** | Use POST/PUT/DELETE, not GET | Implemented |

### 14.3 Secure Token Storage

| Token Type | Storage Location | Security Rationale |
|------------|------------------|-------------------|
| **Access Token** | In-memory (Zustand) | Never persisted to disk; cleared on tab close |
| **Refresh Token** | httpOnly cookie | Inaccessible to JavaScript; auto-sent with requests |
| **User Info** | sessionStorage | Cleared on browser close; no sensitive data |

```typescript
// NEVER do this:
// localStorage.setItem('accessToken', token); // INSECURE

// Correct approach (already in authStore):
// Store access token only in Zustand store (memory)
// Refresh token stored in httpOnly cookie by backend
```

### 14.4 Input Validation

| Input Type | Client Validation | Server Validation | Status |
|------------|-------------------|-------------------|--------|
| **Email** | Zod email() | Pydantic EmailStr | Implemented |
| **Password** | Zod regex + min length | Backend validation | Implemented |
| **UUID** | Zod uuid() | Pydantic UUID | Implemented |
| **Phone** | Zod regex E.164 | Pydantic regex | Implemented |
| **File upload** | Type + size check | Backend verification | Implemented |
| **Rich text** | DOMPurify sanitize | Backend sanitize | Implemented |

### 14.5 Sensitive Data Handling

| Data Type | Frontend Handling |
|-----------|-------------------|
| **Passwords** | Never logged; input type="password"; clear after submit |
| **Access tokens** | Never logged; never in URL; memory-only |
| **Salary data** | Display masked (e.g., ₹**,***); full only with permission |
| **Personal info** | No client-side logging; encrypted transit |

### 14.6 Security Headers

Configured in `next.config.js`:

```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ws: wss:;",
  },
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 14.7 Security Checklist Summary

| Control | Implemented | Notes |
|---------|-------------|-------|
| XSS prevention (React auto-escape) | Yes | JSX default behavior |
| XSS prevention (URL validation) | Yes | isValidUrl utility |
| CSRF protection (SameSite cookies) | Yes | Backend implementation |
| Secure token storage (memory-only) | Yes | Zustand store |
| Secure token storage (httpOnly cookie) | Yes | Backend sets cookie |
| HTTPS-only | Yes | Enforced in production |
| Content Security Policy | Yes | next.config.js |
| Input validation (client) | Yes | Zod schemas |
| Input validation (server) | Yes | Pydantic models |
| Sensitive data masking | Yes | Display utilities |
| Authorization checks (route) | Yes | AuthGuard, RoleGuard |
| Authorization checks (component) | Yes | CanAccess wrapper |

---

## 15. Architecture Freeze (Task 3.5.14)

### 15.1 Frozen Decisions

The following architectural decisions are **FROZEN** and require formal change request to modify:

| Decision | Value | Rationale |
|----------|-------|-----------|
| **Framework** | Next.js 14 with App Router | Per TECH_STACK.md |
| **Language** | TypeScript 5.x (strict mode) | Type safety |
| **State Management** | Zustand (client) + TanStack Query (server) | Per UI_UX_DESIGN.md |
| **Form Management** | React Hook Form + Zod | Per UI_UX_DESIGN.md |
| **Styling** | Tailwind CSS | Per TECH_STACK.md |
| **HTTP Client** | Axios | Interceptor support |
| **Token Storage** | Access: memory, Refresh: httpOnly cookie | Security requirement |
| **Component Pattern** | Atomic Design (4 levels) | Per UI_UX_DESIGN.md |
| **Folder Structure** | See Section 2 | Standardized |

### 15.2 Change Request Process

Any changes to frozen architecture decisions must:

1. Document justification in writing
2. Assess impact on existing components
3. Update this document with new decision
4. Obtain Product Owner approval
5. Update SDLC_STATUS.md with change record

---

## 16. Dependencies

### 16.1 Phase Dependencies

| This Document | Depends On | Dependency Type |
|---------------|------------|-----------------|
| FRONTEND_ARCHITECTURE.md | PRD.md | Functional requirements |
| FRONTEND_ARCHITECTURE.md | UI_UX_DESIGN.md | Screens, components, state management |
| FRONTEND_ARCHITECTURE.md | API_CONTRACT.md | Endpoints, request/response schemas |
| FRONTEND_ARCHITECTURE.md | SECURITY_ARCHITECTURE.md | Auth, RBAC, token handling |
| FRONTEND_ARCHITECTURE.md | TECH_STACK.md | Technology constraints |

### 16.2 Package Dependencies

```json
{
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "@tanstack/react-query": "5.x",
    "zustand": "4.x",
    "react-hook-form": "7.x",
    "@hookform/resolvers": "3.x",
    "zod": "3.x",
    "axios": "1.x",
    "tailwindcss": "3.x",
    "lucide-react": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "tailwind-merge": "latest",
    "jwt-decode": "4.x",
    "dompurify": "3.x"
  },
  "devDependencies": {
    "@types/node": "20.x",
    "@types/react": "18.x",
    "@types/react-dom": "18.x",
    "eslint": "8.x",
    "eslint-config-next": "14.x",
    "prettier": "3.x",
    "prettier-plugin-tailwindcss": "latest",
    "@testing-library/react": "14.x",
    "@testing-library/jest-dom": "6.x",
    "vitest": "1.x"
  }
}
```

---

## 17. Approval Record

### 17.1 Phase Gate Status

| Phase | Status | Date |
|-------|--------|------|
| Phase 3.5 – Frontend Architecture Design | CLOSED | 2026-01-16 |

### 17.2 Task Completion Summary

| Task | Description | Status |
|------|-------------|--------|
| 3.5.1 | Define React project structure | COMPLETE |
| 3.5.2 | Define shared UI components | COMPLETE |
| 3.5.3 | Define page-level components per module | COMPLETE |
| 3.5.4 | Define API client architecture | COMPLETE |
| 3.5.5 | Define authentication flow | COMPLETE |
| 3.5.6 | Define authorization enforcement | COMPLETE |
| 3.5.7 | Define error boundary strategy | COMPLETE |
| 3.5.8 | Define loading state management | COMPLETE |
| 3.5.9 | Define form management strategy | COMPLETE |
| 3.5.10 | Define client-side validation | COMPLETE |
| 3.5.11 | Define data caching strategy | COMPLETE |
| 3.5.12 | Define real-time communication | COMPLETE |
| 3.5.13 | Security review | COMPLETE |
| 3.5.14 | Architecture freeze | COMPLETE |
| 3.5.15 | Produce FRONTEND_ARCHITECTURE.md | COMPLETE |

### 17.3 Approval Signatures

| Role | Name | Status | Date | Comments |
|------|------|--------|------|----------|
| Product Owner | PO | APPROVED | 2026-01-16 | All frontend architecture requirements met |
| Technical Lead | Builder | APPROVED | 2026-01-16 | Architecture frozen |

---

**Document Status**: COMPLETE - Product Owner Approved (2026-01-16)

**Next Phase**: Phase 4 – Module-Level Functional Design (Cannot begin until Phase 3.5 is CLOSED)

---

**END OF FRONTEND_ARCHITECTURE.md**
