import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, leftIcon, rightIcon, className = '', ...props }, ref) => {
        return (
            <div className="w-full space-y-2">
                {label && (
                    <label className="block text-sm font-medium text-zinc-400 ml-1">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-brand transition-colors">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3.5 
              text-sm transition-all focus:outline-none focus:ring-1 focus:ring-brand/50 
              focus:bg-white/[0.05] placeholder:text-zinc-600 outline-none
              ${leftIcon ? 'pl-11' : ''} 
              ${rightIcon ? 'pr-11' : ''}
              ${error ? 'border-red-500/50 focus:ring-red-500/50' : ''}
              ${className}
            `}
                        {...props}
                    />
                {rightIcon && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">
                        {rightIcon}
                    </div>
                )}
            </div>
                {error && <p className="text-xs text-red-500 ml-1">{error}</p>}
                {!error && helperText ? <p className="text-xs text-zinc-500 ml-1">{helperText}</p> : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
