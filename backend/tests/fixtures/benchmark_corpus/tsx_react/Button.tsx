import React from 'react';

export function PrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="primary-btn" onClick={onClick}>
      {label}
    </button>
  );
}
