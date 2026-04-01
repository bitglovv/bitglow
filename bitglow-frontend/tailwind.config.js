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
                zinc: {
                    950: '#09090b',
                    900: '#121214',
                    800: '#1e1e20',
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

