import React, { useState, useRef } from "react";
import { TableObject } from "./InteractiveTable";

interface DraggableObjectProps {
  object: TableObject;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  tableRef: React.RefObject<HTMLDivElement>;
  scale?: number;
  isMobile?: boolean;
}

export const DraggableObject = ({ 
  object, 
  onMove, 
  onRemove, 
  tableRef,
  scale = 1,
  isMobile = false
}: DraggableObjectProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [lastTap, setLastTap] = useState(0);
  const objectRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return; // Use touch events on mobile
    startDrag(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling
    
    const now = Date.now();
    const timeSinceLast = now - lastTap;
    
    // Double tap to remove (on mobile)
    if (timeSinceLast < 300 && timeSinceLast > 0) {
      onRemove(object.id);
      return;
    }
    setLastTap(now);
    
    const touch = e.touches[0];
    startDrag(touch.clientX, touch.clientY);
  };

  const startDrag = (clientX: number, clientY: number) => {
    if (!objectRef.current || !tableRef.current) return;

    const objectRect = objectRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: clientX - objectRect.left,
      y: clientY - objectRect.top,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !tableRef.current) return;
    updatePosition(e.clientX, e.clientY);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging || !tableRef.current) return;
    e.preventDefault(); // Prevent scrolling
    
    const touch = e.touches[0];
    updatePosition(touch.clientX, touch.clientY);
  };

  const updatePosition = (clientX: number, clientY: number) => {
    if (!tableRef.current) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to table coordinates
    let newX = (clientX - tableRect.left - dragOffset.x) / scale;
    let newY = (clientY - tableRect.top - dragOffset.y) / scale;

    // Keep object within table bounds (using base dimensions)
    const maxX = 800 - 60; // TABLE_BASE_WIDTH - object width
    const maxY = 600 - 60; // TABLE_BASE_HEIGHT - object height
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    onMove(object.id, newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    if (!isMobile) { // Only on desktop
      onRemove(object.id);
    }
  };

  // Function to wrap text and limit to 10 lines
  const formatTextForPaper = (text: string) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxCharsPerLine = isMobile ? 8 : 12; // Shorter lines on mobile
    const maxLines = 10;

    for (const word of words) {
      if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
        
        if (lines.length >= maxLines) {
          break;
        }
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    if (lines.length === maxLines && words.length > lines.join(' ').split(' ').length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
    }

    return lines;
  };

  // Attach global events when dragging
  React.useEffect(() => {
    if (isDragging) {
      if (isMobile) {
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      } else {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }
      
      return () => {
        if (isMobile) {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        } else {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        }
      };
    }
  }, [isDragging, dragOffset, scale]);

  const isCustomEmoji = object.type === "custom-emoji";
  const isPaper = object.isText && !isCustomEmoji;
  
  // Scale object size based on screen scale and mobile
  const objectSize = isMobile ? 50 : 60;
  const scaledSize = objectSize * scale;

  return (
    <div
      ref={objectRef}
      className={`absolute flex items-center justify-center transition-all duration-200 ${
        isDragging 
          ? 'scale-110 shadow-2xl z-10' 
          : 'hover:scale-105 hover:shadow-xl'
      } ${isPaper ? '' : 'rounded-2xl shadow-lg bg-white/80 border-2 border-border'} ${
        isMobile ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
      style={{
        left: `${object.x * scale}px`,
        top: `${object.y * scale}px`,
        width: isPaper ? 'auto' : `${scaledSize}px`,
        height: isPaper ? 'auto' : `${scaledSize}px`,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
        fontSize: `${scale}rem`, // Scale text with table
        touchAction: 'none', // Prevent browser touch behaviors
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onDoubleClick={handleDoubleClick}
      title={isMobile ? `Double-tap to remove ${object.type}` : `Double-click to remove ${object.type}`}
    >
      {isPaper ? (
        <div 
          className="bg-white border border-gray-300 shadow-lg p-2 flex items-start justify-start text-black leading-tight overflow-hidden" 
          style={{ 
            aspectRatio: '1/1.414',
            minWidth: `${(isMobile ? 60 : 80) * scale}px`,
            maxWidth: `${(isMobile ? 90 : 120) * scale}px`,
            minHeight: `${(isMobile ? 75 : 100) * scale}px`,
            fontSize: `${(isMobile ? 10 : 12) * scale}px`,
          }}
        >
          <div className="w-full h-full flex flex-col">
            {formatTextForPaper(object.emoji).map((line, index) => (
              <div key={index} className="break-words hyphens-auto" style={{ wordBreak: 'break-word' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ fontSize: `${(isMobile ? 20 : 30) * scale}px` }} className="drop-shadow-sm">
          {object.emoji}
        </div>
      )}
      
      {isDragging && (
        <div 
          className="absolute left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap"
          style={{ 
            top: `${-32 * scale}px`,
            fontSize: `${10 * scale}px`
          }}
        >
          {object.type}
        </div>
      )}
    </div>
  );
};