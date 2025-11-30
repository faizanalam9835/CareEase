import React from 'react'

const Input = ({ 
  label, 
  type = 'text', 
  icon, 
  rightIcon,
  error,
  className = '',
  ...props 
}) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-semibold text-cyan-800 mb-2">
          {label}
        </label>
      )}
      <div className="relative rounded-xl shadow-sm">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={`
            block w-full rounded-xl border-2 pl-10 pr-10
            focus:border-cyan-500 focus:ring-cyan-500
            transition-all duration-200 bg-white/80
            ${icon ? 'pl-10' : 'pl-4'}
            ${rightIcon ? 'pr-10' : 'pr-4'}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-cyan-200'}
            py-3 sm:py-3.5 font-medium text-cyan-900 placeholder-cyan-400
            hover:border-cyan-300 text-sm sm:text-base
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600 font-medium">{error.message}</p>
      )}
    </div>
  )
}

export default Input