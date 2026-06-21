import React, { useState } from 'react';
import { cn } from './Typography';

export function Tooltip({ content, children, position = 'top', className }) {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div 
          className={cn(
            "absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-gray-900 dark:bg-gray-800 rounded shadow-sm whitespace-nowrap",
            positions[position],
            className
          )}
          role="tooltip"
        >
          {content}
          {/* Arrow */}
          <div className={cn(
            "absolute w-2 h-2 bg-gray-900 dark:bg-gray-800 transform rotate-45",
            position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2' : '',
            position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2' : '',
            position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2' : '',
            position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2' : ''
          )} />
        </div>
      )}
    </div>
  );
}
