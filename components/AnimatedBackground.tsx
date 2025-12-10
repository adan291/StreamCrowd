import React from 'react';

interface AnimatedBackgroundProps {
  variant?: 'default' | 'subtle' | 'vibrant';
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ variant = 'default' }) => {
  return (
    <div className="animated-bg-container">
      {/* Gradient orbs */}
      <div className="animated-orb orb-1" />
      <div className="animated-orb orb-2" />
      <div className="animated-orb orb-3" />
      
      {/* Grid pattern overlay */}
      <div className="animated-grid" />
      
      {/* Noise texture */}
      <div className="animated-noise" />
      
      {/* Shimmer effect */}
      <div className="animated-shimmer" />
    </div>
  );
};

export default AnimatedBackground;
