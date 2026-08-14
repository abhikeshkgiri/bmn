import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
  size?: 'sm' | 'md' | 'lg' | 'icon';
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
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-brand-pink text-white hover:bg-brand-pink-hover focus-visible:outline-brand-pink',
      secondary: 'bg-brand-black text-white hover:bg-neutral-800 focus-visible:outline-brand-black',
      outline: 'border-2 border-neutral-300 bg-white text-brand-black hover:bg-neutral-50 focus-visible:outline-brand-pink',
      ghost: 'bg-transparent text-brand-black hover:bg-neutral-100 focus-visible:outline-brand-pink',
      destructive: 'bg-error-500 text-white hover:bg-error-600 focus-visible:outline-error-500',
      link: 'bg-transparent text-brand-pink hover:text-brand-pink-hover underline focus-visible:outline-brand-pink',
    };

    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2.5 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-lg',
      icon: 'p-2 rounded-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className || ''}`}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin mr-2" />
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

export default Button;
