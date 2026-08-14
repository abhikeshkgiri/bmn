import React, { useState } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top', delay = 200 }) => {
  const [visible, setVisible] = useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  const sideStyles = {
    top: 'bottom-full mb-2 left-1/2 transform -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 transform -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 transform -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 transform -translate-y-1/2',
  };

  const arrowStyles = {
    top: 'bottom-[-4px] left-1/2 transform -translate-x-1/2 border-t-8 border-x-4 border-x-transparent border-t-brand-black',
    bottom: 'top-[-4px] left-1/2 transform -translate-x-1/2 border-b-8 border-x-4 border-x-transparent border-b-brand-black',
    left: 'left-[-4px] top-1/2 transform -translate-y-1/2 border-l-8 border-y-4 border-y-transparent border-l-brand-black',
    right: 'right-[-4px] top-1/2 transform -translate-y-1/2 border-r-8 border-y-4 border-y-transparent border-r-brand-black',
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {visible && (
        <div className={`absolute ${sideStyles[side]} z-50 pointer-events-none`}>
          <div className="bg-brand-black text-white px-2 py-1 rounded text-sm whitespace-nowrap">
            {content}
            <div className={`absolute ${arrowStyles[side]}`} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Tooltip;
