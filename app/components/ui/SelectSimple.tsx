import React from 'react';

interface SelectSimpleProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function SelectSimple({ children, className = '', ...props }: SelectSimpleProps) {
  return (
    <select
      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Export as Select for compatibility
export { SelectSimple as Select };
