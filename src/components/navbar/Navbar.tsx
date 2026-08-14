import React from 'react';

interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, children, ...props }, ref) => (
    <nav
      ref={ref}
      className={`bg-white border-b border-border ${className || ''}`}
      {...props}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {children}
        </div>
      </div>
    </nav>
  )
);
Navbar.displayName = 'Navbar';

interface NavbarBrandProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const NavbarBrand = React.forwardRef<HTMLDivElement, NavbarBrandProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex-shrink-0 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
NavbarBrand.displayName = 'NavbarBrand';

interface NavbarMenuProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const NavbarMenu = React.forwardRef<HTMLDivElement, NavbarMenuProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center gap-8 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
NavbarMenu.displayName = 'NavbarMenu';

interface NavbarMenuItemProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  active?: boolean;
  children: React.ReactNode;
}

const NavbarMenuItem = React.forwardRef<HTMLAnchorElement, NavbarMenuItemProps>(
  ({
    active = false,
    className,
    children,
    ...props
  }, ref) => (
    <a
      ref={ref}
      className={`
        font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink
        ${active ? 'text-brand-pink' : 'text-foreground hover:text-brand-pink'}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </a>
  )
);
NavbarMenuItem.displayName = 'NavbarMenuItem';

interface NavbarActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const NavbarActions = React.forwardRef<HTMLDivElement, NavbarActionsProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center gap-4 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  )
);
NavbarActions.displayName = 'NavbarActions';

export { Navbar, NavbarBrand, NavbarMenu, NavbarMenuItem, NavbarActions };
