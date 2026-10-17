import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
}

const Logo = React.forwardRef<HTMLAnchorElement, LogoProps>(
  ({ size = 'md', href = '/', className }, ref) => {
    const sizeStyles = {
      sm: 'text-xl font-bold',
      md: 'text-2xl font-bold',
      lg: 'text-4xl font-bold',
    };

    const content = (
      <span className={`${sizeStyles[size]} tracking-tight ${className || ''}`}>
        <span style={{ color: '#111111' }}>Book</span>
        <span style={{ color: '#FF2D7A' }}>My</span>
        <span style={{ color: '#111111' }}>Nai</span>
      </span>
    );

    if (href) {
      return (
        <a
          ref={ref}
          href={href}
          className="inline-block hover:opacity-80 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink rounded-sm"
        >
          {content}
        </a>
      );
    }

    return <div className="inline-block">{content}</div>;
  }
);

Logo.displayName = 'Logo';

export default Logo;
