/**
 * AlertBanner Component
 * @module roycss/ui/feedback/AlertBanner
 * @description Alert messages with success/error/warning/info variants
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

export type AlertBannerVariant = 'success' | 'error' | 'warning' | 'info';

export interface AlertBannerProps {
  /** Alert variant */
  variant: AlertBannerVariant;
  /** Alert title */
  title?: string;
  /** Alert message */
  children: React.ReactNode;
  /** Dismissible */
  dismissible?: boolean;
  /** On dismiss callback */
  onDismiss?: () => void;
  /** Action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  /** Icon override */
  icon?: React.ReactNode;
  /** Show icon */
  showIcon?: boolean;
  /** Banner style */
  bannerStyle?: 'solid' | 'outlined' | 'soft';
  /** Custom class name */
  className?: string;
}

const variantConfig = {
  success: {
    solid: 'bg-success text-success-foreground',
    outlined: 'border-success text-success bg-success/5',
    soft: 'bg-success/10 text-success border-success/30',
    icon: CheckCircle2,
  },
  error: {
    solid: 'bg-destructive text-destructive-foreground',
    outlined: 'border-destructive text-destructive bg-destructive/5',
    soft: 'bg-destructive/10 text-destructive border-destructive/30',
    icon: AlertCircle,
  },
  warning: {
    solid: 'bg-warning text-warning-foreground',
    outlined: 'border-warning text-warning bg-warning/5',
    soft: 'bg-warning/10 text-warning border-warning/30',
    icon: AlertTriangle,
  },
  info: {
    solid: 'bg-info text-info-foreground',
    outlined: 'border-info text-info bg-info/5',
    soft: 'bg-info/10 text-info border-info/30',
    icon: Info,
  },
};

export function AlertBanner({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  action,
  icon,
  showIcon = true,
  bannerStyle = 'soft',
  className,
}: AlertBannerProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4 animate-in fade-in-0 duration-200',
        config[bannerStyle],
        bannerStyle === 'solid' && 'border-transparent',
        bannerStyle === 'outlined' && 'border',
        bannerStyle === 'soft' && 'border',
        className
      )}
    >
      {/* Icon */}
      {showIcon && (
        <div className="shrink-0 mt-0.5">
          {icon || <IconComponent className="h-5 w-5" />}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        {title && (
          <h4 className="font-semibold text-sm leading-tight">{title}</h4>
        )}
        <div className="text-sm opacity-90 leading-relaxed">{children}</div>

        {/* Action Button */}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className={cn(
              'mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              action.variant === 'primary' && 'bg-white/20 hover:bg-white/30',
              action.variant === 'secondary' && 'bg-black/10 hover:bg-black/20',
              (!action.variant || action.variant === 'ghost') && 'underline underline-offset-4'
            )}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss Button */}
      {dismissible && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-0.5 rounded-md opacity-70 hover:opacity-100 transition-opacity"
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Inline alert for smaller spaces
export interface InlineAlertProps extends Omit<AlertBannerProps, 'bannerStyle'> {
  /** Size */
  size?: 'sm' | 'md';
}

export function InlineAlert({
  variant,
  title,
  children,
  showIcon = true,
  size = 'sm',
  className,
}: InlineAlertProps) {
  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-2 rounded-md px-3 py-2',
        config.soft,
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        className
      )}
    >
      {showIcon && (
        <IconComponent className={cn('shrink-0', size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      )}
      <div className="flex-1 min-w-0">
        {title && <span className="font-medium">{title} </span>}
        <span className="opacity-90">{children}</span>
      </div>
    </div>
  );
}

export default AlertBanner;
