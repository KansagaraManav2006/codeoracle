import React from 'react';

interface WorkspaceShellProps {
  children: React.ReactNode;
  className?: string;
}

export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-[1240px] mx-auto transition-all duration-base ${className}`}>
      {children}
    </div>
  );
};

export default WorkspaceShell;
