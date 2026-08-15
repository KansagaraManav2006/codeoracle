/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#F5F1E9',
        surface: '#FFFDFC',
        'section-sand': '#ECE5DA',
        inset: '#E7DFD3',
        'border-subtle': '#C8BEB0',
        'border-strong': '#9E9282',
        'txt-primary': '#181715',
        'txt-secondary': '#3B3733',
        'txt-muted': '#5C554D',
        'txt-disabled': '#8C8276',
        darknav: '#181715',
        darkcode: '#1C1A17',
        brand: {
          primary: '#4C4FD6',
          'primary-hover': '#3E41B8',
          surface: '#EAE9FB',
          text: '#383BA8',
          50: '#f0f4ff',
          100: '#e0e7ff',
          500: '#4C4FD6',
          600: '#4C4FD6',
          700: '#3E41B8',
          900: '#383BA8',
        },
        signal: {
          primary: '#B88228',
          surface: '#F5E8CC',
          text: '#664711',
        },
        semantic: {
          success: {
            bg: '#D9ECE6',
            text: '#1B4E48',
            icon: '#2A7A71',
            border: '#ACCFC6',
          },
          warning: {
            bg: '#F5E8CC',
            text: '#664711',
            icon: '#B88228',
            border: '#DEC695',
          },
          danger: {
            bg: '#F5DED9',
            text: '#7A322D',
            icon: '#B54C46',
            border: '#E3B0A9',
          },
          info: {
            bg: '#DFEAF0',
            text: '#2C4E61',
            icon: '#486E85',
            border: '#B6CDD8',
          },
        },
      },
      boxShadow: {
        warm: '0 4px 20px -2px rgba(24, 23, 21, 0.10)',
        'warm-lg': '0 10px 32px -4px rgba(24, 23, 21, 0.14)',
        card: '0 2px 10px rgba(24, 23, 21, 0.07), 0 0 0 1px #C8BEB0',
      },
      borderRadius: {
        '2card': '20px',
        'hero': '32px',
      },
    },
  },
  plugins: [],
}
