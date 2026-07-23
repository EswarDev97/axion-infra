import { Router } from 'express';
import authRoutes from './auth.routes';
import publicRoutes from './public.routes';
import employeeRoutes from './employees.routes';
import departmentRoutes from './departments.routes';
import positionRoutes from './positions.routes';
import attendanceRoutes from './attendance.routes';
import holidayRoutes from './holidays.routes';
import leaveRoutes from './leave.routes';
import payrollRoutes from './payroll.routes';
import documentRoutes from './documents.routes';
import roleRoutes from './roles.routes';
import tasksRoutes from './tasks.routes';
import expensesRoutes from './expenses.routes';
import approvalsRoutes from './approvals.routes';
import notificationsRoutes from './notifications.routes';
import complaintsRoutes from './complaints.routes';
import trainingRoutes from './training.routes';
import reportsRoutes from './reports.routes';
import mindmapsRoutes from './mindmaps.routes';
import billingRoutes from './billing.routes';
import crmRoutes from './crm.routes';

const router = Router();

// Public routes (no authentication required)
router.use('/public', publicRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/employees', employeeRoutes);
router.use('/departments', departmentRoutes);
router.use('/positions', positionRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/holidays', holidayRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/documents', documentRoutes);
router.use('/roles', roleRoutes);
router.use('/tasks', tasksRoutes);
router.use('/expenses', expensesRoutes);
router.use('/approvals', approvalsRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/complaints', complaintsRoutes);
router.use('/training', trainingRoutes);
router.use('/reports', reportsRoutes);
router.use('/mindmaps', mindmapsRoutes);
router.use('/billing', billingRoutes);
router.use('/crm/leads', crmRoutes);

export default router;
