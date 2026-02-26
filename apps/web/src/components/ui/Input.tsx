import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, id, className = '', ...props }, ref) => {
    const inputId = id || label.replace(/\s/g, '-').toLowerCase();
    return (
      <div className="flex flex-col gap-xs">
        <label htmlFor={inputId} className="text-body-bold text-neutral-900">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          className={`h-[48px] px-lg rounded-input border border-neutral-200 text-body text-neutral-900
            placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
            transition-colors ${error ? 'border-danger' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-caption text-danger">{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

export default Input;
