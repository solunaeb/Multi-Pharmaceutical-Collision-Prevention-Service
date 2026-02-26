'use client';

import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'default' | 'sm';
  loading?: boolean;
  children: React.ReactNode;
}

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark active:bg-primary-dark',
  secondary: 'bg-white text-neutral-900 border border-neutral-200 hover:bg-neutral-50',
  ghost: 'bg-transparent text-neutral-600 hover:bg-neutral-50',
  danger: 'bg-danger text-white hover:bg-red-600',
};

export default function Button({
  variant = 'primary',
  size = 'default',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-sm font-medium
        rounded-button transition-colors
        ${size === 'default' ? 'h-[52px] px-xl text-body' : 'h-[40px] px-lg text-caption'}
        ${variants[variant]}
        ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''}
        min-w-[48px] min-h-[48px]
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={18} className="animate-spin" />}
      {children}
    </button>
  );
}
