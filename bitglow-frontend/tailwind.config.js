export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: '#10b77f',
                    light: '#34d399',
                    dark: '#059669',
                    glow: 'rgba(16, 183, 127, 0.4)',
                },
                white: 'rgb(var(--color-white) / <alpha-value>)',
                black: 'rgb(var(--color-black) / <alpha-value>)',
                zinc: {
                    50: 'rgb(var(--color-zinc-50) / <alpha-value>)',
                    100: 'rgb(var(--color-zinc-100) / <alpha-value>)',
                    200: 'rgb(var(--color-zinc-200) / <alpha-value>)',
                    300: 'rgb(var(--color-zinc-300) / <alpha-value>)',
                    400: 'rgb(var(--color-zinc-400) / <alpha-value>)',
                    500: 'rgb(var(--color-zinc-500) / <alpha-value>)',
                    600: 'rgb(var(--color-zinc-600) / <alpha-value>)',
                    700: 'rgb(var(--color-zinc-700) / <alpha-value>)',
                    800: 'rgb(var(--color-zinc-800) / <alpha-value>)',
                    900: 'rgb(var(--color-zinc-900) / <alpha-value>)',
                    950: 'rgb(var(--color-zinc-950) / <alpha-value>)',
                },
                glass: {
                    DEFAULT: 'rgba(255, 255, 255, 0.05)',
                    dark: 'rgba(0, 0, 0, 0.4)',
                    border: 'rgba(255, 255, 255, 0.1)',
                }
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    '0%, 100%': { opacity: 0.8 },
                    '50%': { opacity: 1, filter: 'brightness(1.2)' },
                }
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'mesh': "url('https://grainy-gradients.vercel.app/noise.svg')",
                'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0))',
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}

