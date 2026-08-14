import React, { useState } from 'react';

interface TabsProps {
  defaultValue?: string;
  children: React.ReactNode;
}

interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  children: React.ReactNode;
}

interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
  children: React.ReactNode;
}

interface TabsContextType {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextType | undefined>(undefined);

const Tabs: React.FC<TabsProps> = ({ defaultValue = '', children }) => {
  const [value, setValue] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

const useTabs = () => {
  const context = React.useContext(TabsContext);
  if (!context) {
    throw new Error('useTabs must be used within a Tabs component');
  }
  return context;
};

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={`flex border-b border-border ${className || ''}`}
      role="tablist"
      {...props}
    >
      {children}
    </div>
  )
);
TabsList.displayName = 'TabsList';

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: activeValue, setValue } = useTabs();

    return (
      <button
        ref={ref}
        onClick={() => setValue(value)}
        className={`
          px-4 py-3 font-medium text-sm transition-colors relative
          ${activeValue === value
            ? 'text-brand-pink'
            : 'text-foreground-secondary hover:text-foreground'
          }
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-pink
          ${className || ''}
        `}
        role="tab"
        aria-selected={activeValue === value}
        {...props}
      >
        {children}
        {activeValue === value && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-pink" />
        )}
      </button>
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: activeValue } = useTabs();

    if (activeValue !== value) return null;

    return (
      <div
        ref={ref}
        className={`py-4 ${className || ''}`}
        role="tabpanel"
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
