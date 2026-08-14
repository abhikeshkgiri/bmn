import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

interface DropdownItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink focus-visible:outline-offset-2"
      >
        {trigger}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-48 bg-white border border-border rounded-lg shadow-bookmynai-md z-50">
          {children}
        </div>
      )}
    </div>
  );
};

const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, className, ...props }, ref) => (
    <button
      ref={ref}
      className={`
        w-full text-left px-4 py-2 text-sm text-foreground
        hover:bg-pink-50 hover:text-brand-pink
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink focus-visible:outline-offset-0
        transition-colors border-b border-border last:border-b-0
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </button>
  )
);
DropdownItem.displayName = 'DropdownItem';

export { Dropdown, DropdownItem };
