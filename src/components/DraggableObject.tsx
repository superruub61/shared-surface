import React, { useState, useRef } from "react";
import { TableObject } from "./InteractiveTable";

interface DraggableObjectProps {
  object: TableObject;
  onMove: (id: string, x: number, y: number) => void;
  onRemove: (id: string) => void;
  tableRef: React.RefObject<HTMLDivElement>;
}

export const DraggableObject = ({ 
  object, 
  onMove, 
  onRemove, 
  tableRef 
}: DraggableObjectProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const objectRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!objectRef.current || !tableRef.current) return;

    const objectRect = objectRef.current.getBoundingClientRect();
    const tableRect = tableRef.current.getBoundingClientRect();

    setIsDragging(true);
    setDragOffset({
      x: e.clientX - objectRect.left,
      y: e.clientY - objectRect.top,
    });

    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !tableRef.current) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    
    let newX = e.clientX - tableRect.left - dragOffset.x;
    let newY = e.clientY - tableRect.top - dragOffset.y;

    // Keep object within table bounds
    const maxX = tableRect.width - 60;
    const maxY = tableRect.height - 60;
    
    newX = Math.max(0, Math.min(newX, maxX));
    newY = Math.max(0, Math.min(newY, maxY));

    onMove(object.id, newX, newY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDoubleClick = () => {
    onRemove(object.id);
  };

  // Function to wrap text and limit to 10 lines
  const formatTextForPaper = (text: string) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';
    const maxCharsPerLine = 12; // Approximate characters per line
    const maxLines = 10;

    for (const word of words) {
      // If adding this word would exceed line length, start new line
      if (currentLine.length + word.length + 1 > maxCharsPerLine && currentLine.length > 0) {
        lines.push(currentLine);
        currentLine = word;
        
        // Stop if we've reached max lines
        if (lines.length >= maxLines) {
          break;
        }
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word;
      }
    }
    
    // Add the last line if there's content and we haven't exceeded max lines
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    // If we had to truncate, add ellipsis to the last line
    if (lines.length === maxLines && words.length > lines.join(' ').split(' ').length) {
      lines[maxLines - 1] = lines[maxLines - 1].slice(0, -3) + '...';
    }

    return lines;
  };

  // Attach global mouse events when dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const isCustomEmoji = object.type === "custom-emoji";
  const isPaper = object.isText && !isCustomEmoji;

  return (
    <div
      ref={objectRef}
      className={`absolute flex items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-200 ${
        isDragging 
          ? 'scale-110 shadow-2xl z-10' 
          : 'hover:scale-105 hover:shadow-xl'
      } ${isPaper ? '' : 'w-[60px] h-[60px] rounded-2xl shadow-lg bg-white/80 border-2 border-border'}`}
      style={{
        left: `${object.x}px`,
        top: `${object.y}px`,
        transform: isDragging ? 'rotate(5deg)' : 'rotate(0deg)',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title={`Double-click to remove ${object.type}`}
    >
      {isPaper ? (
        <div className="bg-white border border-gray-300 shadow-lg p-2 min-w-[80px] max-w-[120px] min-h-[100px] flex items-start justify-start text-xs text-black leading-tight overflow-hidden" 
             style={{ aspectRatio: '1/1.414' }}>
          <div className="w-full h-full flex flex-col">
            {formatTextForPaper(object.emoji).map((line, index) => (
              <div key={index} className="break-words hyphens-auto" style={{ wordBreak: 'break-word' }}>
                {line}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-3xl drop-shadow-sm">
          {object.emoji}
        </div>
      )}
      
      {isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs whitespace-nowrap">
          {object.type}
        </div>
      )}
    </div>
  );
};