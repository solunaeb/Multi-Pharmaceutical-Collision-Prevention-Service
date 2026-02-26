import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, id, className = '', ...props }, ref) => {
    const selectId = id || label.replace(/\s/g, '-').toLowerCase();
    return (
      <div className="flex flex-col gap-xs">
        <label htmlFor={selectId} className="text-body-bold text-neutral-900">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={`h-[48px] px-lg rounded-input border border-neutral-200 text-body text-neutral-900
            bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-colors ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-caption text-danger">{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

export default Select;
