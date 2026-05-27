/**
 * Tests for AssistantChat component
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssistantChat } from '../AssistantChat';

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ response: 'Test response' }),
  })
) as jest.Mock;

describe('AssistantChat', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders quick questions when no messages', () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
    expect(screen.getByText(/Ask about your project/)).toBeInTheDocument();
  });

  test('displays quick question buttons', () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    expect(screen.getByText('What is the current project status?')).toBeInTheDocument();
    expect(screen.getByText('Help me with a feature')).toBeInTheDocument();
  });

  test('renders existing messages', () => {
    const messages = [
      {
        role: 'user' as const,
        content: 'Hello, how are you?',
        timestamp: '2024-01-01T10:00:00.000Z',
      },
      {
        role: 'assistant' as const,
        content: 'I am doing well, thank you!',
        timestamp: '2024-01-01T10:00:01.000Z',
      },
    ];

    render(
      <AssistantChat
        messages={messages}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('I am doing well, thank you!')).toBeInTheDocument();
  });

  test('sends message on button click', async () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test message' } });

    const sendButton = screen.getByRole('button', { name: '' }); // Send icon button
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Test message',
        })
      );
    });
  });

  test('sends message on Enter key', async () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'user',
          content: 'Test message',
        })
      );
    });
  });

  test('does not send on Shift+Enter (allows new line)', async () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });

    // Should not call onSendMessage
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  test('shows loading state while sending', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'Test response' }),
          } as Response);
        }, 100);
      })
    );

    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Check for loading indicator
    await waitFor(() => {
      expect(screen.getByText(/Thinking/i)).toBeInTheDocument();
    });
  });

  test('selects quick question and sets input', () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const quickQuestionButton = screen.getByText('What is the current project status?');
    fireEvent.click(quickQuestionButton);

    const input = screen.getByPlaceholderText(/Ask about your project/) as HTMLTextAreaElement;
    expect(input.value).toBe('What is the current project status?');
  });

  test('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(mockOnSendMessage).toHaveBeenCalledTimes(2); // user message + error message
    });
  });

  test('disables send button when input is empty', () => {
    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const sendButton = screen.getByRole('button').closest('button');
    expect(sendButton).toBeDisabled();
  });

  test('disables send button while loading', async () => {
    (global.fetch as jest.Mock).mockImplementation(
      () => new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'Test' }),
          } as Response);
        }, 100);
      })
    );

    render(
      <AssistantChat
        messages={[]}
        onSendMessage={mockOnSendMessage}
        projectName="test-project"
      />
    );

    const input = screen.getByPlaceholderText(/Ask about your project/);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const sendButton = screen.getByRole('button').closest('button');
      expect(sendButton).toBeDisabled();
    });
  });
});
