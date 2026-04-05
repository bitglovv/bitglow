import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100';

    const variants = {
        primary: 'relative overflow-hidden bg-brand-gradient text-white shadow-[0_18px_38px_-20px_rgba(126,231,168,0.42)] hover:-translate-y-[1px] hover:brightness-110 focus:ring-2 focus:ring-emerald-200/30 before:pointer-events-none before:absolute before:inset-x-6 before:top-2 before:h-5 before:rounded-full before:bg-white/18 before:blur-md',
        secondary: 'bg-white/[0.06] text-white border border-white/10 backdrop-blur-xl hover:bg-white/[0.12] hover:border-white/20 shadow-[0_4px_15px_-3px_rgba(0,0,0,0.4)] active:bg-white/[0.18] transition-all',
        ghost: 'text-zinc-500 hover:text-white hover:bg-white/5 focus:ring-2 focus:ring-white/10',
        danger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 focus:ring-2 focus:ring-red-500/40',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs rounded-xl',
        md: 'px-6 py-3 text-sm rounded-2xl',
        lg: 'px-8 py-4 text-base rounded-3xl',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <svg className="relative z-10 -ml-1 mr-3 h-5 w-5 animate-spin text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : null}
            <span className="relative z-10">{children}</span>
        </button>
    );
};
