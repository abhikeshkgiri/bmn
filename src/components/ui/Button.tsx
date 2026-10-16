import React from 'react';
import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'border-pink-700 bg-pink-700 text-white shadow-sm hover:border-pink-800 hover:bg-pink-800 active:bg-pink-900',
  secondary: 'border-brand-black bg-brand-black text-white shadow-sm hover:bg-neutral-800 active:bg-neutral-900',
  outline: 'border-neutral-400 bg-white text-brand-black shadow-sm hover:border-pink-700 hover:bg-pink-50 hover:text-pink-800 active:bg-pink-100',
  ghost: 'border-transparent bg-transparent text-brand-black hover:bg-neutral-100 active:bg-neutral-200',
  destructive: 'border-error-600 bg-error-600 text-white hover:bg-error-700 active:bg-error-700',
  link: 'border-transparent bg-transparent text-pink-800 underline-offset-4 hover:text-pink-900 hover:underline active:text-pink-900',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-10 px-3 text-sm',
  md: 'px-4 py-2.5 text-base',
  lg: 'min-h-12 px-6 text-lg',
  icon: 'min-h-11 min-w-11 p-2',
};

const baseStyles = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:text-neutral-700 disabled:shadow-none';

function getButtonClassName(
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
  className?: string,
) {
  return `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className || ''}`;
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    isLoading = false,
    fullWidth = false,
    disabled = false,
    className,
    children,
    ...props
  }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={getButtonClassName(variant, size, fullWidth, className)}
        {...props}
      >
        {isLoading ? (
          <>
            <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

interface ButtonLinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function ButtonLink({
  href,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={getButtonClassName(variant, size, fullWidth, className)}
      {...props}
    >
      {children}
    </Link>
  );
}

export default Button;
