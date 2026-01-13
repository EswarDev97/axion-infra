import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { EmployeeProfile } from '@/components/employees/EmployeeProfile';
import { EmployeeDocuments } from '@/components/employees/EmployeeDocuments';
import { EmployeeAttendance } from '@/components/employees/EmployeeAttendance';
import { EmployeeLeave } from '@/components/employees/EmployeeLeave';
import { EmployeePayroll } from '@/components/employees/EmployeePayroll';
import { getEmployee } from '@/lib/api/employees';

interface EmployeeDetailPageProps {
  params: { id: string };
}

export async function generateMetadata({
  params,
}: EmployeeDetailPageProps): Promise<Metadata> {
  const employee = await getEmployee(params.id);

  if (!employee) {
    return { title: 'Employee Not Found - AxionPCS HRMS' };
  }

  return {
    title: `${employee.user.firstName} ${employee.user.lastName} - AxionPCS HRMS`,
  };
}

export default async function EmployeeDetailPage({
  params,
}: EmployeeDetailPageProps) {
  const employee = await getEmployee(params.id);

  if (!employee) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
            {employee.user.avatar ? (
              <img
                src={employee.user.avatar}
                alt={employee.user.firstName}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-semibold text-gray-500">
                {employee.user.firstName[0]}
                {employee.user.lastName[0]}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {employee.user.firstName} {employee.user.lastName}
            </h1>
            <p className="text-gray-600">
              {employee.designation} &bull; {employee.department?.name}
            </p>
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                employee.employmentStatus === 'ACTIVE'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {employee.employmentStatus}
            </span>
          </div>
        </div>
        <a
          href={`/dashboard/employees/${params.id}/edit`}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
        >
          Edit Employee
        </a>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <EmployeeProfile employee={employee} />
        </TabsContent>

        <TabsContent value="documents">
          <EmployeeDocuments employeeId={params.id} />
        </TabsContent>

        <TabsContent value="attendance">
          <EmployeeAttendance employeeId={params.id} />
        </TabsContent>

        <TabsContent value="leave">
          <EmployeeLeave employeeId={params.id} />
        </TabsContent>

        <TabsContent value="payroll">
          <EmployeePayroll employeeId={params.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
