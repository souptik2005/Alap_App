import React from 'react';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

interface ForgotPasswordPageProps {
  onNavigateToLogin: () => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateToLogin,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 chat-bg-pattern">
      <ForgotPasswordForm onNavigateToLogin={onNavigateToLogin} />
    </div>
  );
};
