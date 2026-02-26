interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  const Component = onClick ? 'button' : 'div';
  return (
    <Component
      className={`bg-white rounded-card shadow-card p-lg ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow w-full text-left' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}
