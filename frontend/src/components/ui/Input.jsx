import React, { forwardRef, useId } from 'react';
import { cn } from './Typography';

export const Input = forwardRef(({ 
  className, 
  type = "text",
  error,
  label,
  required,
  ...props 
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-muted dark:text-muted-dark uppercase tracking-wider mb-1.5">
          {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={cn(
          "w-full px-3 py-2 border-2 rounded-lg bg-bg dark:bg-bg-dark text-text dark:text-text-dark text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-gray-800 min-h-[44px]",
          error ? "border-danger" : "border-border dark:border-border-dark",
          className
        )}
        ref={ref}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-danger" role="alert">
          {error.message || error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
