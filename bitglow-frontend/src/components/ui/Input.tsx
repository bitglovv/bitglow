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
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-brand">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              w-full rounded-2xl border border-[#102C26] bg-[#102C26]/15 px-4 py-3.5
              text-sm text-white shadow-[0_10px_30px_-25px_rgba(0,0,0,0.7)] transition-all
              outline-none placeholder:text-zinc-600 focus:scale-[1.01] focus:border-brand/60
              focus:bg-[#102C26]/25 focus:ring-4 focus:ring-brand/10
              ${leftIcon ? 'pl-11' : ''} 
              ${rightIcon ? 'pr-11' : ''}
              ${error ? 'border-red-500/40 focus:border-red-400/45 focus:ring-red-500/10' : ''}
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
                {error && <p className="ml-1 text-xs text-red-500">{error}</p>}
                {!error && helperText ? <p className="ml-1 text-xs text-zinc-500">{helperText}</p> : null}
            </div>
        );
    }
);

Input.displayName = 'Input';
