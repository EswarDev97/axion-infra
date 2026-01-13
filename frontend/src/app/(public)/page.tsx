import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AxionPCS - Transforming HR Management',
  description: 'AxionPCS provides cutting-edge HR solutions for modern businesses',
};

export default function HomePage() {
  return (
    <>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-6">
              Transforming Human Resource Management
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Streamline your HR operations with our comprehensive HRMS solution.
              From recruitment to retirement, we&apos;ve got you covered.
            </p>
            <div className="flex gap-4">
              <Link
                href="/contact"
                className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
              >
                Get Started
              </Link>
              <Link
                href="/about"
                className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/10 transition"
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Choose AxionPCS?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-6 rounded-xl border border-gray-200 hover:shadow-lg transition"
              >
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4">
                  <span className="text-2xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            Comprehensive HR Modules
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Everything you need to manage your workforce efficiently
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((module, index) => (
              <div
                key={index}
                className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition"
              >
                <h3 className="font-semibold mb-2">{module.name}</h3>
                <p className="text-sm text-gray-600">{module.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your HR?
          </h2>
          <p className="text-xl mb-8 text-primary-100">
            Join hundreds of companies already using AxionPCS
          </p>
          <Link
            href="/contact"
            className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition"
          >
            Contact Sales
          </Link>
        </div>
      </section>
    </>
  );
}

const features = [
  {
    icon: '🚀',
    title: 'Easy to Use',
    description:
      'Intuitive interface designed for HR professionals and employees alike.',
  },
  {
    icon: '🔒',
    title: 'Secure & Compliant',
    description:
      'Enterprise-grade security with role-based access control and audit trails.',
  },
  {
    icon: '📊',
    title: 'Powerful Analytics',
    description:
      'AI-powered insights to make data-driven HR decisions.',
  },
];

const modules = [
  {
    name: 'Employee Management',
    description: 'Complete employee lifecycle management',
  },
  {
    name: 'Attendance Tracking',
    description: 'Real-time attendance with geolocation',
  },
  {
    name: 'Leave Management',
    description: 'Streamlined leave requests and approvals',
  },
  {
    name: 'Payroll Processing',
    description: 'Automated salary calculations and payslips',
  },
  {
    name: 'Document Management',
    description: 'Secure storage with AI classification',
  },
  {
    name: 'Recruitment',
    description: 'End-to-end hiring with resume parsing',
  },
  {
    name: 'Performance Reviews',
    description: 'Goal setting and performance tracking',
  },
  {
    name: 'Reports & Analytics',
    description: 'Comprehensive HR dashboards and reports',
  },
];
