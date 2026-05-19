/**
 * MindFlow - SearchInput Component
 * Per FRONTEND_ARCHITECTURE.md Section 3.2.2
 * Supports both controlled (value/onChange) and callback (onSearch) patterns
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { useDebounce } from '@/hooks/ui/useDebounce';
import { cn } from '@/utils/cn';

export interface SearchInputProps {
  placeholder?: string;
  // Callback pattern (with debounce)
  onSearch?: (value: string) => void;
  debounceMs?: number;
  defaultValue?: string;
  // Controlled pattern
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export function SearchInput({
  placeholder = 'Search...',
  onSearch,
  debounceMs = 300,
  defaultValue = '',
  value: controlledValue,
  onChange,
  className,
}: SearchInputProps) {
  // Use controlled value if provided, otherwise use internal state
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;

  const debouncedSearch = useDebounce((searchValue: string) => {
    onSearch?.(searchValue);
  }, debounceMs);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (isControlled) {
        onChange?.(newValue);
      } else {
        setInternalValue(newValue);
      }

      // Call debounced search if using callback pattern
      if (onSearch) {
        debouncedSearch(newValue);
      }
    },
    [isControlled, onChange, onSearch, debouncedSearch]
  );

  const handleClear = useCallback(() => {
    if (isControlled) {
      onChange?.('');
    } else {
      setInternalValue('');
    }
    onSearch?.('');
  }, [isControlled, onChange, onSearch]);

  return (
    <div className={cn('relative', className)}>
      <Input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        leftIcon={<Search className="h-4 w-4" />}
        rightIcon={
          value ? (
            <button
              type="button"
              onClick={handleClear}
              className="hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : undefined
        }
      />
    </div>
  );
}
