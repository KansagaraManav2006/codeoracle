import React from 'react';

interface WorkspaceShellProps {
  children: React.ReactNode;
  className?: string;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full max-w-workspace mx-auto bg-surface border border-line rounded-2xl p-4 sm:p-6 shadow-shell transition-all duration-base ${className}`}
    >
      {children}
    </div>
  );
};

export default WorkspaceShell;
