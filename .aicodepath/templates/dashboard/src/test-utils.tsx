/**
 * Test utilities and mocks
 */

import React from 'react';

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// Mock react-markdown for tests
jest.mock('react-markdown', () => {
  return function MockReactMarkdown({ children }: { children: React.ReactNode }) {
    return <div className="mock-markdown">{children}</div>;
  };
});

jest.mock('remark-gfm', () => ({
  default: () => ({}),
}));
