import React from 'react';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

interface UpdatePasswordPageProps {
  onResetSuccess: () => void;
  onNavigateToLogin?: () => void;
}

export const UpdatePasswordPage: React.FC<UpdatePasswordPageProps> = ({
  onResetSuccess,
  onNavigateToLogin,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 chat-bg-pattern">
      <ResetPasswordForm
        onSuccess={onResetSuccess}
        onNavigateToLogin={onNavigateToLogin}
      />
    </div>
  );
};
