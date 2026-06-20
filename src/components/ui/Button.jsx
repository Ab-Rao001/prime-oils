import React from 'react';
import { cn } from './Typography';

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  isLoading,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50 disabled:pointer-events-none min-h-[44px] min-w-[44px]';
  
  const variants = {
    primary: 'bg-primary dark:bg-gold text-white dark:text-white hover:bg-primary-light dark:hover:bg-gold-dark border-none',
    secondary: 'bg-card border-2 border-border text-text hover:bg-bg dark:bg-card-dark dark:border-border-dark dark:text-text-dark dark:hover:bg-bg-dark',
    outline: 'bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white dark:border-gold dark:text-gold dark:hover:bg-gold dark:hover:text-white',
    ghost: 'bg-transparent text-primary hover:bg-primary/10 dark:text-gold dark:hover:bg-gold/10',
    danger: 'bg-danger text-white hover:bg-danger/90 border-none',
    success: 'bg-success text-white hover:bg-success/90 border-none',
  };

  const sizes = {
    xs: 'px-2 py-1 text-xs h-8',
    sm: 'px-3 py-1.5 text-sm h-10',
    md: 'px-4 py-2 text-base h-11',
    lg: 'px-6 py-3 text-lg h-12',
  };

  return (
    <button
      type={props.type || "button"}
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-live="polite"
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!isLoading && leftIcon && <span className="mr-2 flex items-center">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2 flex items-center">{rightIcon}</span>}
    </button>
  );
}
