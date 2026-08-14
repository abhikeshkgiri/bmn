import React from 'react';

interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ orientation = 'horizontal', className, ...props }, ref) => {
    const isVertical = orientation === 'vertical';

    return (
      <div
        ref={ref}
        className={`bg-border ${
          isVertical
            ? 'w-px h-full min-h-[1px]'
            : 'h-px w-full'
        } ${className || ''}`}
        role="separator"
        {...props}
      />
    );
  }
);

Separator.displayName = 'Separator';

export default Separator;
