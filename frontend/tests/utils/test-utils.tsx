/**
 * Test Utilities
 * Per SDLC Phase 7 - Testing & Quality Assurance
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';

// Create a custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  }

  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    queryClient,
  };
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent };

// Custom matchers
export const toBeInTheDocument = (element: HTMLElement | null) => {
  const pass = element !== null && document.body.contains(element);
  return {
    pass,
    message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
  };
};

// Helper to wait for element to appear
export const waitForElement = async (
  getElement: () => HTMLElement | null,
  timeout = 5000
): Promise<HTMLElement> => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const element = getElement();
    if (element) return element;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Element not found within timeout');
};

// Helper to mock form submission
export const fillAndSubmitForm = async (
  user: ReturnType<typeof userEvent.setup>,
  fields: Record<string, string>,
  submitButtonText = 'Submit'
) => {
  for (const [fieldName, value] of Object.entries(fields)) {
    const input = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
    if (input) {
      await user.clear(input);
      await user.type(input, value);
    }
  }

  const submitButton = document.querySelector(`button[type="submit"]`) ||
    Array.from(document.querySelectorAll('button')).find(
      btn => btn.textContent?.includes(submitButtonText)
    );

  if (submitButton) {
    await user.click(submitButton);
  }
};
