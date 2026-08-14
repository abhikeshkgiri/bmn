import React, { useState, useEffect } from 'react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  onEscapeKeyDown?: () => void;
}

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

interface DialogFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const DialogContext = React.createContext<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
} | undefined>(undefined);

const Dialog: React.FC<DialogProps> = ({ open: controlledOpen, onOpenChange, children }) => {
  const [internalOpen, setInternalOpen] = useState(controlledOpen ?? false);
  const open = controlledOpen ?? internalOpen;
  const handleOpenChange = onOpenChange || setInternalOpen;

  return (
    <DialogContext.Provider value={{ open, onOpenChange: handleOpenChange }}>
      {children}
    </DialogContext.Provider>
  );
};

const useDialog = () => {
  const context = React.useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a Dialog component');
  }
  return context;
};

const DialogTrigger = React.forwardRef<HTMLButtonElement, DialogTriggerProps>(
  ({ children, ...props }, ref) => {
    const { onOpenChange } = useDialog();

    return (
      <button
        ref={ref}
        onClick={() => onOpenChange(true)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
DialogTrigger.displayName = 'DialogTrigger';

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ children, onEscapeKeyDown, className, ...props }, ref) => {
    const { open, onOpenChange } = useDialog();

    useEffect(() => {
      if (!open) return;

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onEscapeKeyDown?.();
          onOpenChange(false);
        }
      };

      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }, [open, onOpenChange, onEscapeKeyDown]);

    if (!open) return null;

    return (
      <>
        <div
          className="fixed inset-0 bg-black/45 z-50"
          onClick={() => onOpenChange(false)}
        />
        <div
          ref={ref}
          className={`
            fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
            bg-white border border-border rounded-lg shadow-bookmynai-lg
            max-w-lg w-full mx-auto p-6 z-50
            max-h-[90vh] overflow-auto
            ${className || ''}
          `}
          role="dialog"
          aria-modal="true"
          {...props}
        >
          {children}
        </div>
      </>
    );
  }
);
DialogContent.displayName = 'DialogContent';

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={`mb-4 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
DialogHeader.displayName = 'DialogHeader';

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ children, className, ...props }, ref) => (
    <h2
      ref={ref}
      className={`text-xl font-semibold text-foreground ${className || ''}`}
      {...props}
    >
      {children}
    </h2>
  )
);
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ children, className, ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-foreground-secondary mt-2 ${className || ''}`}
      {...props}
    >
      {children}
    </p>
  )
);
DialogDescription.displayName = 'DialogDescription';

const DialogFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={`mt-6 flex items-center justify-end gap-2 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
DialogFooter.displayName = 'DialogFooter';

export { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter };
