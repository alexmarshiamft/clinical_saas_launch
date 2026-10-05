import * as React from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectContextType {
  value: string;
  onValueChange: (val: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedLabel: string;
  setSelectedLabel: (label: string) => void;
}

const SelectContext = React.createContext<SelectContextType>({
  value: '',
  onValueChange: () => {},
  open: false,
  setOpen: () => {},
  selectedLabel: '',
  setSelectedLabel: () => {},
});

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (val: string) => void;
  children: React.ReactNode;
}

export function Select({ value: controlledValue, defaultValue = '', onValueChange, children }: SelectProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [open, setOpen] = React.useState(false);
  const [selectedLabel, setSelectedLabel] = React.useState('');

  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  const handleValueChange = React.useCallback(
    (newVal: string) => {
      if (!isControlled) {
        setInternalValue(newVal);
      }
      onValueChange?.(newVal);
      setOpen(false);
    },
    [isControlled, onValueChange]
  );

  return (
    <SelectContext.Provider
      value={{
        value,
        onValueChange: handleValueChange,
        open,
        setOpen,
        selectedLabel,
        setSelectedLabel,
      }}
    >
      <div className="relative inline-block w-full">{children}</div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { open, setOpen } = React.useContext(SelectContext);

  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 transition-colors',
        className
      )}
      {...props}
    >
      <span className="truncate">{children}</span>
      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0 ml-2" />
    </button>
  );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
  const { value, selectedLabel } = React.useContext(SelectContext);
  return <span>{selectedLabel || value || placeholder}</span>;
}

export function SelectContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = React.useContext(SelectContext);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-transparent"
        onClick={() => setOpen(false)}
      />
      <div
        className={cn(
          'absolute left-0 top-full z-50 mt-1 max-h-60 w-full min-w-[8rem] overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg animate-in fade-in zoom-in-95',
          className
        )}
      >
        {children}
      </div>
    </>
  );
}

export function SelectItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { value: selectedValue, onValueChange, setSelectedLabel } = React.useContext(SelectContext);
  const isSelected = selectedValue === value;

  React.useEffect(() => {
    if (isSelected && typeof children === 'string') {
      setSelectedLabel(children);
    }
  }, [isSelected, children, setSelectedLabel]);

  return (
    <div
      onClick={() => {
        if (typeof children === 'string') setSelectedLabel(children);
        onValueChange(value);
      }}
      className={cn(
        'relative flex w-full cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 outline-none hover:bg-indigo-50 hover:text-indigo-900 transition-colors',
        isSelected && 'bg-indigo-50 font-semibold text-indigo-900',
        className
      )}
    >
      <span>{children}</span>
      {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
    </div>
  );
}
