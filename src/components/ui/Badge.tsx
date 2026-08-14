import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'pink' | 'success' | 'warning' | 'error' | 'info' | 'outline';
  children: React.ReactNode;
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const variantStyles = {
      default: 'bg-neutral-100 text-foreground border border-neutral-200',
      pink: 'bg-pink-50 text-pink-700 border border-pink-200',
      success: 'bg-success-50 text-success-600 border border-success-200',
      warning: 'bg-warning-50 text-warning-600 border border-warning-200',
      error: 'bg-error-50 text-error-600 border border-error-200',
      info: 'bg-info-50 text-info-600 border border-info-200',
      outline: 'bg-transparent text-foreground border border-border',
    };

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          ${variantStyles[variant]}
          ${className || ''}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
