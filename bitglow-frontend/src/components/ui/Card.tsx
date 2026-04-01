import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'dark';
    padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
    children,
    className = '',
    variant = 'glass',
    padding = 'md'
}) => {
    const variants = {
        default: 'bg-zinc-900 border border-zinc-800 rounded-3xl',
        glass: 'bg-white/[0.03] border border-white/10 backdrop-blur-xl rounded-3xl shadow-2xl',
        dark: 'bg-black/40 border border-white/5 backdrop-blur-2xl rounded-3xl',
    };

    const paddings = {
        none: '',
        sm: 'p-4',
        md: 'p-8',
        lg: 'p-12',
    };

    return (
        <div className={`${variants[variant]} ${paddings[padding]} ${className}`}>
            {children}
        </div>
    );
};
