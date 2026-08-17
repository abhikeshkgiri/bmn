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
    const baseStyles = 'inline-flex items-center justify-center font-medium border transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500 disabled:border-neutral-300';

    const variantStyles = {
      primary:
        'border-brand-pink bg-brand-pink text-white shadow-sm hover:bg-brand-pink-hover hover:text-white active:bg-[#C2185B] focus-visible:outline-brand-pink',
      secondary:
        'border-brand-black bg-brand-black text-white shadow-sm hover:bg-neutral-800 hover:text-white active:bg-neutral-900 focus-visible:outline-brand-black',
      outline:
        'border-brand-pink/30 bg-transparent text-brand-black shadow-sm hover:border-brand-pink hover:bg-brand-pink/5 hover:text-brand-pink active:bg-brand-pink/10 focus-visible:outline-brand-pink',
      ghost:
        'border-transparent bg-neutral-100 text-brand-black hover:bg-neutral-200 hover:text-brand-black active:bg-neutral-300 focus-visible:outline-brand-pink',
      destructive:
        'border-error-500 bg-error-500 text-white hover:bg-error-600 hover:text-white active:bg-error-700 focus-visible:outline-error-500',
      link:
        'border-transparent bg-transparent text-brand-pink underline-offset-4 hover:text-brand-pink-hover hover:underline active:text-brand-pink-hover focus-visible:outline-brand-pink',
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
