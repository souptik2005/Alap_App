import React from 'react';

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col space-y-2 p-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100/60">
          <div className="w-11 h-11 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-slate-200 rounded-md w-1/3" />
            <div className="h-3 bg-slate-200 rounded-md w-3/4" />
          </div>
          <div className="w-10 h-3 bg-slate-200 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
};
