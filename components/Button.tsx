import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyles = "px-4 py-2 rounded-lg font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-twitch-brand hover:bg-twitch-light text-white shadow-[0_0_15px_rgba(169,112,255,0.3)] hover:shadow-[0_0_25px_rgba(169,112,255,0.5)]",
    secondary: "bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700",
    danger: "bg-red-600 hover:bg-red-500 text-white",
    ghost: "bg-transparent hover:bg-zinc-800 text-zinc-300"
  };

  const widthStyle = fullWidth ? "w-full" : "";

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};