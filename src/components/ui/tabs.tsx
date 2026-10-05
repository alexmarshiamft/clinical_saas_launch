import * as React from 'react';
import { cn } from '@/lib/utils';

interface TabsContextType {
  value: string;
  onValueChange: (val: string) => void;
}

const TabsContext = React.createContext<TabsContextType>({
  value: '',
  onValueChange: () => {},
});

export interface TabsProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export function Tabs({
  value: controlledValue,
  defaultValue = '',
  onValueChange,
  className,
  children,
  ...props
}: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal);
      }
      onValueChange?.(newVal);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn('flex flex-col gap-3', className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex h-9 items-center justify-start rounded-lg bg-slate-100 p-1 text-slate-500 gap-1',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  value,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      type="button"
      data-state={isActive ? 'active' : 'inactive'}
      onClick={() => onValueChange(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-xs font-semibold ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        isActive
          ? 'bg-white text-indigo-900 shadow-xs font-bold'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value: string }) {
  const { value: activeValue } = React.useContext(TabsContext);
  if (activeValue !== value) return null;

  return (
    <div
      data-state="active"
      className={cn('outline-none animate-in fade-in-50', className)}
      {...props}
    >
      {children}
    </div>
  );
}
