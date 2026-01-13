import { apiClient } from './client';

export interface JobPosting {
  id: string;
  slug: string;
  title: string;
  description: string;
  requirements?: string;
  responsibilities?: string;
  department?: {
    id: string;
    name: string;
  };
  location?: string;
  employmentType: string;
  experienceMin?: number;
  experienceMax?: number;
  salaryMin?: number;
  salaryMax?: number;
  showSalary: boolean;
  skills: string[];
  benefits: string[];
  publishedAt: string;
}

export async function getJobPostings(): Promise<JobPosting[]> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/public/careers`,
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
      }
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch job postings:', error);
    return [];
  }
}

export async function getJobPosting(slug: string): Promise<JobPosting | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/public/careers/${slug}`,
      {
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Failed to fetch job posting:', error);
    return null;
  }
}

export async function submitApplication(
  slug: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/public/careers/${slug}/apply`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    return {
      success: response.ok,
      message: data.data?.message || data.error?.message,
    };
  } catch (error) {
    console.error('Failed to submit application:', error);
    return {
      success: false,
      message: 'Failed to submit application. Please try again.',
    };
  }
}
