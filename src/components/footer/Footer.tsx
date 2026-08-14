import React from 'react';

interface FooterProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Footer = React.forwardRef<HTMLElement, FooterProps>(
  ({ className, children, ...props }, ref) => (
    <footer
      ref={ref}
      className={`bg-white border-t border-border ${className || ''}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {children}
      </div>
    </footer>
  )
);
Footer.displayName = 'Footer';

interface FooterSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  title?: string;
}

const FooterSection = React.forwardRef<HTMLDivElement, FooterSectionProps>(
  ({ className, children, title, ...props }, ref) => (
    <div
      ref={ref}
      className={`${className || ''}`}
      {...props}
    >
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
      )}
      {children}
    </div>
  )
);
FooterSection.displayName = 'FooterSection';

interface FooterLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
}

const FooterLink = React.forwardRef<HTMLAnchorElement, FooterLinkProps>(
  ({ className, children, ...props }, ref) => (
    <a
      ref={ref}
      className={`
        text-sm text-foreground-secondary hover:text-brand-pink
        transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink
        block mb-2
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </a>
  )
);
FooterLink.displayName = 'FooterLink';

const FooterDivider = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={`border-t border-border my-8 ${className || ''}`}
      {...props}
    />
  )
);
FooterDivider.displayName = 'FooterDivider';

interface FooterBottomProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const FooterBottom = React.forwardRef<HTMLDivElement, FooterBottomProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`text-xs text-foreground-secondary text-center ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
FooterBottom.displayName = 'FooterBottom';

export { Footer, FooterSection, FooterLink, FooterDivider, FooterBottom };
