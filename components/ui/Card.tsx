import { HTMLAttributes } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'sm' | 'md' | 'lg' | 'none';
}

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };

export default function Card({ padding = 'md', className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
