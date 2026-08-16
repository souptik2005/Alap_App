import React from 'react';

interface DateDividerProps {
  label: string;
}

export const DateDivider: React.FC<DateDividerProps> = ({ label }) => {
  return (
    <div className="flex justify-center w-full my-3">
      <span className="text-[11px] font-semibold text-slate-600 bg-white/90 backdrop-blur-xs border border-slate-200 px-3 py-1 rounded-full shadow-2xs">
        {label}
      </span>
    </div>
  );
};
