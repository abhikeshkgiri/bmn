import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = '#FF2D7A' }) => {
  const sizeStyles = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={`${sizeStyles[size]} border-2 border-transparent rounded-full animate-spin`}
      style={{
        borderTopColor: color,
        borderRightColor: color,
      }}
    />
  );
};

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
  borderRadius?: string;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({
    width = '100%',
    height = '1rem',
    borderRadius = '0.5rem',
    className,
    ...props
  }, ref) => (
    <div
      ref={ref}
      className={`bg-neutral-100 animate-pulse ${className || ''}`}
      style={{ width, height, borderRadius }}
      {...props}
    />
  )
);
Skeleton.displayName = 'Skeleton';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({
    isLoading = false,
    loadingText = 'Loading...',
    disabled = false,
    children,
    className,
    ...props
  }, ref) => (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 ${className || ''}`}
      {...props}
    >
      {isLoading && <Spinner size="sm" />}
      {isLoading ? loadingText : children}
    </button>
  )
);
LoadingButton.displayName = 'LoadingButton';

export { Spinner, Skeleton, LoadingButton };
