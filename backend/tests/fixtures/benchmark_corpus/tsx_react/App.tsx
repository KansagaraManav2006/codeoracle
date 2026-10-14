import React from 'react';
import { PrimaryButton } from './Button';

export function App() {
  const handleClick = () => {
    console.log('Button clicked');
  };

  return (
    <div className="container">
      <h1>Application Dashboard</h1>
      <PrimaryButton label="Submit Action" onClick={handleClick} />
    </div>
  );
}
