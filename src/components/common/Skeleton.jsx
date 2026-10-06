import React from 'react';

export const Skeleton = ({
  variant = 'text', // text, rect, circle
  height = '1em',
  width = '100%',
  className = ""
}) => {
  const getStyle = () => {
    const style = { width };
    if (variant === 'circle') {
      style.height = height;
      style.borderRadius = '50%';
    } else {
      style.height = height;
      style.borderRadius = variant === 'rect' ? '10px' : '4px';
    }
    return style;
  };

  return (
    <div 
      className={`placeholder-glow ${className}`} 
      style={getStyle()}
    >
      <span className="placeholder w-100 h-100 bg-secondary opacity-10 rounded d-block" style={{ minHeight: height }}></span>
    </div>
  );
};
export default Skeleton;
