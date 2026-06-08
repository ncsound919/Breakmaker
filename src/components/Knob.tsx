import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  formatValue?: (val: number) => string;
}

export function Knob({ label, value, onChange, min = 0, max = 100, formatValue }: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
       // Reset to mid point if 0 is out of bounds, otherwise to min
       const defaultVal = min <= 0 && max >= 0 ? 0 : min + (max-min)/2;
       onChange(Math.round(defaultVal));
       return;
    }
    setIsDragging(true);
    startYRef.current = e.clientY;
    startValueRef.current = value;
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditValue(String(value));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
       const parsed = parseFloat(editValue);
       if (!isNaN(parsed)) {
          const newVal = Math.max(min, Math.min(max, parsed));
          onChange(Math.round(newVal));
       }
       setIsEditing(false);
    } else if (e.key === 'Escape') {
       setIsEditing(false);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const sensitivity = 0.5; // Adjust as needed
      let newValue = startValueRef.current + deltaY * sensitivity * (range / 100);
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(Math.round(newValue));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, onChange]);

  const rotation = ((value - min) / (max - min)) * 270 - 135;
  const displayValue = formatValue ? formatValue(value) : value;

  return (
    <div className="flex flex-col items-center">
      <div 
        className="relative w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)] cursor-ns-resize" 
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        title="Drag up/down to adjust. Double-click to type. Ctrl+click to reset."
      >
        <div 
          className="absolute top-1/2 left-1/2 w-1 h-1/2 bg-amber-500 origin-bottom rounded-full" 
          style={{ transform: `translate(-50%, -100%) rotate(${rotation}deg)` }} 
        />
      </div>
      <span className="text-[10px] uppercase tracking-wider text-zinc-400 mt-2 font-mono">{label}</span>
      {isEditing ? (
        <input 
          autoFocus
          value={editValue}
          onChange={e => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setIsEditing(false)}
          className="w-12 text-center text-[10px] bg-zinc-900 border border-amber-500 text-amber-500 font-mono rounded outline-none"
        />
      ) : (
        <span 
          className="text-[10px] text-amber-500 font-mono cursor-pointer hover:bg-zinc-800 px-1 rounded transition-colors"
          onDoubleClick={handleDoubleClick}
        >
          {displayValue}
        </span>
      )}
    </div>
  );
}
