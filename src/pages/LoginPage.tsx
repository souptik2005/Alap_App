import React from 'react';
import { LoginForm } from '../components/auth/LoginForm';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateToSignup: () => void;
  onNavigateToForgotPassword?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onNavigateToSignup,
  onNavigateToForgotPassword,
}) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 chat-bg-pattern">
      <LoginForm
        onSuccess={onLoginSuccess}
        onNavigateToSignup={onNavigateToSignup}
        onNavigateToForgotPassword={onNavigateToForgotPassword}
      />
    </div>
  );
};
