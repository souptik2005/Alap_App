import React from 'react';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

interface ResetPasswordPageProps {
  onResetSuccess: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onResetSuccess,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 chat-bg-pattern">
      <ResetPasswordForm onSuccess={onResetSuccess} />
    </div>
  );
};
