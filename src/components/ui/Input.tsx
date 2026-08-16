import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  icon,
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full flex flex-col gap-1.5">
      {label && (
        <label className="text-xs font-semibold text-slate-700 tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </div>
        )}
        <input
          className={`w-full bg-slate-100 text-slate-800 font-normal text-sm rounded-lg py-2.5 ${
            icon ? 'pl-10' : 'pl-4'
          } pr-4 border border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none transition-all placeholder:text-slate-400 ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-600 pl-1">{error}</span>}
    </div>
  );
};

export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => {
  return (
    <Input
      icon={<Search className="w-4 h-4 text-slate-400" />}
      placeholder="Search chats..."
      {...props}
    />
  );
};
