import React from 'react';

interface WorkspaceShellProps {
  children: React.ReactNode;
  className?: string;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full transition-all duration-base ${className}`}>
      {children}
    </div>
  );
};

export default WorkspaceShell;
