import { Metadata } from 'next';
import Link from 'next/link';
import { getJobPostings } from '@/lib/api/careers';

export const metadata: Metadata = {
  title: 'Careers - AxionPCS',
  description: 'Join our team and help transform HR management',
};

// Server component - fetches data on the server
export default async function CareersPage() {
  const jobs = await getJobPostings();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-20">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
          <p className="text-xl text-primary-100 max-w-2xl">
            Help us build the future of HR technology. We&apos;re always looking
            for talented individuals who share our passion.
          </p>
        </div>
      </section>

      {/* Why Join */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Why Work at AxionPCS?
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <div key={index} className="p-6 border rounded-xl">
                <span className="text-3xl mb-4 block">{benefit.icon}</span>
                <h3 className="font-semibold mb-2">{benefit.title}</h3>
                <p className="text-sm text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-8">Open Positions</h2>

          {jobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <p className="text-gray-600 mb-4">
                No open positions at the moment.
              </p>
              <p className="text-sm text-gray-500">
                Check back later or send us your resume at{' '}
                <a href="mailto:careers@axionpcs.com" className="text-primary-600">
                  careers@axionpcs.com
                </a>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/careers/${job.slug}`}
                  className="block bg-white p-6 rounded-xl hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{job.title}</h3>
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>{job.department?.name}</span>
                        <span>{job.location}</span>
                        <span>{formatEmploymentType(job.employmentType)}</span>
                      </div>
                    </div>
                    <span className="text-primary-600 text-sm font-medium">
                      View Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

const benefits = [
  {
    icon: '💰',
    title: 'Competitive Salary',
    description: 'We offer market-leading compensation packages',
  },
  {
    icon: '🏠',
    title: 'Remote First',
    description: 'Work from anywhere with flexible hours',
  },
  {
    icon: '📈',
    title: 'Growth',
    description: 'Learning budget and career development paths',
  },
  {
    icon: '🏥',
    title: 'Benefits',
    description: 'Health insurance and wellness programs',
  },
];
