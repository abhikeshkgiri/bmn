import React from 'react';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'away';
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({
    src,
    alt = 'Avatar',
    initials,
    size = 'md',
    status,
    className,
    ...props
  }, ref) => {
    const sizeStyles = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
    };

    const statusIndicatorSize = {
      sm: 'w-2 h-2',
      md: 'w-3 h-3',
      lg: 'w-3.5 h-3.5',
    };

    const statusStyles = {
      online: 'bg-success-500',
      offline: 'bg-neutral-400',
      away: 'bg-warning-500',
    };

    return (
      <div
        ref={ref}
        className={`relative inline-flex items-center justify-center rounded-full bg-brand-pink text-white font-semibold ${sizeStyles[size]} ${className || ''}`}
        {...props}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span>{initials || 'U'}</span>
        )}
        {status && (
          <span
            className={`absolute bottom-0 right-0 border-2 border-white rounded-full ${statusIndicatorSize[size]} ${statusStyles[status]}`}
            aria-label={`Status: ${status}`}
          />
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
