import React, { forwardRef } from 'react';

const TextField = forwardRef(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = '',
  ...props
}, ref) => {
  const wrapperClasses = fullWidth ? 'w-full' : '';
  
  return (
    <div className={`flex flex-col space-y-1 ${wrapperClasses} ${className}`}>
      {label && (
        <label className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            block w-full rounded-md sm:text-sm transition-colors
            bg-[var(--color-card)] text-[var(--color-text)]
            border border-[var(--color-border)]
            focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent
            disabled:opacity-50 disabled:bg-gray-50
            ${leftIcon ? 'pl-10' : 'pl-3'}
            ${rightIcon ? 'pr-10' : 'pr-3'}
            ${error ? 'border-red-500 focus:ring-red-500' : ''}
            py-2
          `}
          {...props}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <p className={`text-xs mt-1 ${error ? 'text-red-500' : 'text-[var(--color-muted)]'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

TextField.displayName = 'TextField';

export default TextField;
