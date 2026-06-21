import React, { forwardRef, useId } from 'react';
import { cn } from './Typography';

export const Select = forwardRef(({ 
  className, 
  error,
  label,
  required,
  children,
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
      <select
        id={inputId}
        className={cn(
          "w-full px-3 py-2 border-2 rounded-lg bg-bg dark:bg-bg-dark text-text dark:text-text-dark text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 min-h-[44px]",
          error ? "border-danger" : "border-border dark:border-border-dark",
          className
        )}
        ref={ref}
        aria-required={required ? "true" : undefined}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-danger" role="alert">{error.message || error}</p>
      )}
    </div>
  );
});
Select.displayName = "Select";

export const TextArea = forwardRef(({ 
  className, 
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
      <textarea
        id={inputId}
        className={cn(
          "w-full px-3 py-2 border-2 rounded-lg bg-bg dark:bg-bg-dark text-text dark:text-text-dark text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 min-h-[44px]",
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
        <p id={errorId} className="mt-1 text-xs text-danger" role="alert">{error.message || error}</p>
      )}
    </div>
  );
});
TextArea.displayName = "TextArea";

export const Checkbox = forwardRef(({ 
  className, 
  error,
  label,
  description,
  required,
  ...props 
}, ref) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex items-start">
      <div className="flex items-center h-5">
        <input
          id={inputId}
          type="checkbox"
          className={cn(
            "w-5 h-5 rounded border-2 border-border dark:border-border-dark text-gold focus:ring-gold dark:focus:ring-gold bg-bg dark:bg-bg-dark transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-5 sm:h-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
            className
          )}
          ref={ref}
          aria-required={required ? "true" : undefined}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          {...props}
        />
      </div>
      {(label || description) && (
        <div className="ml-3 text-sm">
          {label && (
            <label htmlFor={inputId} className="font-medium text-text dark:text-text-dark cursor-pointer">
              {label} {required && <span className="text-danger" aria-hidden="true">*</span>}
            </label>
          )}
          {description && <p className="text-muted dark:text-muted-dark">{description}</p>}
          {error && <p id={errorId} className="mt-1 text-xs text-danger" role="alert">{error.message || error}</p>}
        </div>
      )}
    </div>
  );
});
Checkbox.displayName = "Checkbox";
