/**
 * MindFlow - Careers API
 * Public endpoints for job postings and applications
 */

// Server-side uses internal Docker URL, client-side uses public URL
const getApiBase = () => {
  if (typeof window === 'undefined') {
    // Server-side: use internal Docker network URL
    return process.env.API_BASE_URL_INTERNAL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
  }
  // Client-side: use public URL
  return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
};

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

/**
 * Get all published job postings (server-side)
 */
export async function getJobPostings(): Promise<JobPosting[]> {
  try {
    const API_BASE = getApiBase();
    const response = await fetch(
      `${API_BASE}/public/careers`,
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

/**
 * Get a specific job posting by slug (server-side)
 */
export async function getJobPosting(slug: string): Promise<JobPosting | null> {
  try {
    const API_BASE = getApiBase();
    const response = await fetch(
      `${API_BASE}/public/careers/${slug}`,
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

/**
 * Submit a job application (client-side)
 * Uses public API URL since this is called from the browser
 */
export async function submitApplication(
  slug: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  try {
    // Always use client-side URL for form submissions
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api/v1';
    const response = await fetch(
      `${API_BASE}/public/careers/${slug}/apply`,
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
