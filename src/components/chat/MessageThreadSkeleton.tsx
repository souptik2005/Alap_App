import React from 'react';

export const MessageThreadSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col space-y-4 p-6 animate-pulse justify-end">
      <div className="flex items-start gap-3 max-w-[60%]">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
        <div className="space-y-1.5 flex-1">
          <div className="h-10 bg-slate-200/80 rounded-2xl rounded-tl-xs w-full" />
        </div>
      </div>

      <div className="flex items-end gap-3 max-w-[60%] self-end">
        <div className="h-12 bg-indigo-200/60 rounded-2xl rounded-tr-xs w-full" />
      </div>

      <div className="flex items-start gap-3 max-w-[50%]">
        <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
        <div className="h-14 bg-slate-200/80 rounded-2xl rounded-tl-xs w-full" />
      </div>

      <div className="flex items-end gap-3 max-w-[45%] self-end">
        <div className="h-9 bg-indigo-200/60 rounded-2xl rounded-tr-xs w-full" />
      </div>
    </div>
  );
};
