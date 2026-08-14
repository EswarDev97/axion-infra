import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getJobPosting } from '@/lib/api/careers';
import { JobApplicationForm } from '@/components/forms/JobApplicationForm';

interface JobDetailPageProps {
  params: { slug: string };
}

export async function generateMetadata({
  params,
}: JobDetailPageProps): Promise<Metadata> {
  const job = await getJobPosting(params.slug);

  if (!job) {
    return { title: 'Job Not Found - Wings Associates' };
  }

  return {
    title: `${job.title} - Careers - Wings Associates`,
    description: job.description?.substring(0, 160),
  };
}

export default async function JobDetailPage({ params }: JobDetailPageProps) {
  const job = await getJobPosting(params.slug);

  if (!job) {
    notFound();
  }

  return (
    <>
      {/* Header */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl">
            <h1 className="text-3xl font-bold mb-4">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-gray-600">
              {job.department && (
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {job.department.name}
                </span>
              )}
              {job.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {job.location}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatEmploymentType(job.employmentType)}
              </span>
              {job.experienceMin !== null && (
                <span className="flex items-center gap-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  {job.experienceMin}-{job.experienceMax || '+'} years
                </span>
              )}
            </div>
            {job.showSalary && job.salaryMin && job.salaryMax && (
              <p className="mt-4 text-lg font-medium text-primary-600">
                ₹{formatSalary(job.salaryMin)} - ₹{formatSalary(job.salaryMax)} per year
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Job Details */}
            <div className="lg:col-span-2 space-y-8">
              {job.description && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">About the Role</h2>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.description }}
                  />
                </div>
              )}

              {job.responsibilities && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Responsibilities</h2>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  />
                </div>
              )}

              {job.requirements && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Requirements</h2>
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: job.requirements }}
                  />
                </div>
              )}

              {job.skills && job.skills.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Required Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {job.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.benefits && job.benefits.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Benefits</h2>
                  <ul className="space-y-2">
                    {job.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Application Form */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <div className="bg-white border rounded-xl p-6">
                  <h2 className="text-xl font-semibold mb-6">Apply Now</h2>
                  <JobApplicationForm jobSlug={params.slug} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function formatEmploymentType(type: string): string {
  return type.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function formatSalary(amount: number): string {
  if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  }
  return amount.toLocaleString();
}
