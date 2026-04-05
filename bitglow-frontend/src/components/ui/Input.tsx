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
                    <label className="ml-1 block text-sm font-medium text-zinc-400">
                        {label}
                    </label>
                )}
                <div className="relative group">
                    {leftIcon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-emerald-200">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full rounded-2xl border border-white/8 bg-white/[0.035] px-4 py-3.5
              text-sm text-white shadow-[0_10px_30px_-25px_rgba(0,0,0,0.7)] transition-all
              outline-none placeholder:text-zinc-600 focus:scale-[1.01] focus:border-emerald-200/18
              focus:bg-white/[0.06] focus:ring-2 focus:ring-emerald-200/12
              ${leftIcon ? 'pl-11' : ''} 
              ${rightIcon ? 'pr-11' : ''}
              ${error ? 'border-red-500/45 focus:border-red-400/45 focus:ring-red-500/20' : ''}
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
                {error && <p className="ml-1 text-xs text-red-400">{error}</p>}
                {!error && helperText ? <p className="ml-1 text-xs text-zinc-500">{helperText}</p> : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
