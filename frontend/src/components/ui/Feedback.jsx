import React from 'react';
import { cn } from './Typography';
import { Button } from './Button';
import { EnterpriseModal } from './EnterpriseModal';

export function Badge({ variant = 'default', children, className }) {
  const variants = {
    pending: 'bg-warning-bg text-warning dark:bg-warning-darkBg',
    approved: 'bg-info-bg text-info dark:bg-info-darkBg',
    rejected: 'bg-danger-bg text-danger dark:bg-danger-darkBg',
    delivered: 'bg-success-bg text-success dark:bg-success-darkBg',
    failed: 'bg-danger-bg text-danger dark:bg-danger-darkBg',
    success: 'bg-success-bg text-success dark:bg-success-darkBg',
    warning: 'bg-warning-bg text-warning dark:bg-warning-darkBg',
    default: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  };

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider",
      variants[variant] || variants.default,
      className
    )}>
      {children}
    </span>
  );
}

export function Alert({ variant = 'info', title, children, className }) {
  const variants = {
    info: 'bg-info-bg border-info text-info dark:bg-info-darkBg',
    success: 'bg-success-bg border-success text-success dark:bg-success-darkBg',
    warning: 'bg-warning-bg border-warning text-warning dark:bg-warning-darkBg',
    danger: 'bg-danger-bg border-danger text-danger dark:bg-danger-darkBg',
  };

  return (
    <div className={cn("p-4 border-l-4 rounded-r-lg", variants[variant], className)} role="alert">
      {title && <h3 className="font-bold text-sm mb-1">{title}</h3>}
      <div className="text-sm">{children}</div>
    </div>
  );
}

export function Skeleton({ className }) {
  return (
    <div className={cn("animate-pulse bg-gray-200 dark:bg-gray-700 rounded", className)} />
  );
}

export function EmptyState({ icon, title, description, action, className }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center rounded-xl border-2 border-dashed border-border dark:border-border-dark", className)}>
      {icon && <div className="text-4xl mb-4 opacity-50">{icon}</div>}
      <h3 className="text-lg font-bold text-text dark:text-text-dark mb-2">{title}</h3>
      {description && <p className="text-muted dark:text-muted-dark max-w-sm mb-6">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = false,
  isLoading = false
}) {
  return (
    <EnterpriseModal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-6">
        <p className="text-text dark:text-text-dark text-base">
          {message}
        </p>
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button 
            variant={isDanger ? 'danger' : 'primary'} 
            onClick={onConfirm} 
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </EnterpriseModal>
  );
}
