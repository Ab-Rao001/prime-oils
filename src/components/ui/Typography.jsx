import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Typography({
  variant = 'body',
  size = 'md',
  weight = 'normal',
  className,
  children,
  as,
  ...props
}) {
  const Component = as || {
    display: 'h1',
    heading: 'h2',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    body: 'p',
    caption: 'span',
    label: 'label',
  }[variant] || 'p';

  const sizeStyles = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
    '3xl': 'text-3xl',
    '4xl': 'text-4xl',
  };

  const weightStyles = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  const variantStyles = {
    display: 'text-text dark:text-text-dark tracking-tight',
    heading: 'text-text dark:text-text-dark tracking-tight',
    h1: 'text-text dark:text-text-dark tracking-tight',
    h2: 'text-text dark:text-text-dark tracking-tight',
    h3: 'text-text dark:text-text-dark',
    h4: 'text-text dark:text-text-dark',
    h5: 'text-text dark:text-text-dark',
    h6: 'text-text dark:text-text-dark',
    body: 'text-text dark:text-text-dark',
    caption: 'text-muted dark:text-muted-dark',
    label: 'text-text dark:text-text-dark uppercase tracking-wider',
  };

  return (
    <Component
      className={cn(
        variantStyles[variant],
        sizeStyles[size],
        weightStyles[weight],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
