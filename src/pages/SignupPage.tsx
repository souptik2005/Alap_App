import React from 'react';
import { SignupForm } from '../components/auth/SignupForm';

interface SignupPageProps {
  onSignupSuccess: () => void;
  onNavigateToLogin: () => void;
}

export const SignupPage: React.FC<SignupPageProps> = ({
  onSignupSuccess,
  onNavigateToLogin,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 chat-bg-pattern">
      <SignupForm
        onSuccess={onSignupSuccess}
        onNavigateToLogin={onNavigateToLogin}
      />
    </div>
  );
};
