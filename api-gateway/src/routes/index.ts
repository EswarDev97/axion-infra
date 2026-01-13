import { Router } from 'express';
import authRoutes from './auth.routes';
import publicRoutes from './public.routes';
import employeeRoutes from './employees.routes';
import departmentRoutes from './departments.routes';
import attendanceRoutes from './attendance.routes';
import leaveRoutes from './leave.routes';
import payrollRoutes from './payroll.routes';
import documentRoutes from './documents.routes';
import roleRoutes from './roles.routes';

const router = Router();

// Public routes (no authentication required)
router.use('/public', publicRoutes);

// Authentication routes
router.use('/auth', authRoutes);

// Protected routes (authentication required)
router.use('/employees', employeeRoutes);
router.use('/departments', departmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/documents', documentRoutes);
router.use('/roles', roleRoutes);

export default router;
