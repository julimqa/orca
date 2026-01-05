/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
  safelist: [
    // Status colors - explicitly include all color classes used
    'bg-emerald-100',
    'bg-emerald-200',
    'bg-emerald-500',
    'bg-emerald-600',
    'bg-emerald-800',
    'text-emerald-600',
    'text-emerald-700',
    'text-emerald-800',
    'hover:bg-emerald-200',
    'hover:bg-emerald-600',
    'border-emerald-200',
    
    'bg-red-100',
    'bg-red-200',
    'bg-red-500',
    'bg-red-600',
    'text-red-600',
    'text-red-700',
    'hover:bg-red-200',
    'hover:bg-red-600',
    
    'bg-amber-100',
    'bg-amber-500',
    'bg-amber-600',
    'bg-amber-800',
    'text-amber-800',
    'hover:bg-amber-600',
    'border-amber-200',
    
    'bg-gray-100',
    'bg-gray-200',
    'bg-gray-400',
    'bg-gray-500',
    'bg-gray-600',
    'bg-gray-700',
    'text-gray-400',
    'text-gray-500',
    'text-gray-600',
    'text-gray-700',
    'text-white',
    'hover:bg-gray-200',
    'hover:bg-gray-500',
    'hover:bg-gray-700',
    
    'bg-blue-100',
    'text-blue-800',
    'border-blue-200',
    
    'bg-rose-100',
    'text-rose-800',
    'border-rose-200',
    
    // Text sizes
    'text-[10px]',
  ]
}
