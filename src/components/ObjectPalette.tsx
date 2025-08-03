import React from "react";
import { Card } from "@/components/ui/card";

interface ObjectType {
  type: string;
  emoji: string;
  color: string;
}

interface ObjectPaletteProps {
  objects: ObjectType[];
  onCustomObject: (input: string) => Promise<ObjectType & { isText?: boolean } | null>;
  onAddObject: (objectData: any, position?: { x: number; y: number }) => void;
  isMobile: boolean;
}

export const ObjectPalette = ({ objects, onCustomObject, onAddObject, isMobile }: ObjectPaletteProps) => {
  
  const handleDragStart = (e: React.DragEvent, object: ObjectType) => {
    if (isMobile) return; // Disable drag on mobile
    e.dataTransfer.setData("application/json", JSON.stringify(object));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleObjectClick = (object: ObjectType) => {
    if (isMobile) {
      // On mobile, add to center of table
      onAddObject(object);
    }
  };

  const handleCustomInput = async () => {
    const input = prompt("Enter an emoji or text for a paper note:");
    if (input && input.trim()) {
      const customObject = await onCustomObject(input.trim());
      if (customObject) {
        onAddObject(customObject);
      }
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-2">
      <div className="mb-4">
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground`}>
          
        </h2>
      </div>
      
      <div className={`grid ${
        isMobile 
          ? 'grid-cols-3 gap-3' 
          : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4'
      }`}>
        {objects.map((object) => (
          <div
            key={object.type}
            draggable={!isMobile}
            onDragStart={(e) => handleDragStart(e, object)}
            onClick={() => handleObjectClick(object)}
            className={`flex flex-col items-center ${
              isMobile ? 'p-3' : 'p-4'
            } rounded-xl hover:border-primary/50 hover:shadow-xl transition-all duration-200 hover:scale-105 ${
              isMobile 
                ? 'cursor-pointer active:scale-95 active:bg-primary/10' 
                : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 drop-shadow-sm`}>
              {object.emoji}
            </div>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground capitalize`}>
              {object.type}
            </span>
          </div>
        ))}
        
        {/* Custom object button */}
        <div
          onClick={handleCustomInput}
          className={`flex flex-col items-center ${
            isMobile ? 'p-3' : 'p-4'
          } rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 shadow-lg border-2 border-dashed border-purple-300 hover:border-purple-500 hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
            isMobile ? 'active:scale-95' : ''
          }`}
        >
          <div className={`${isMobile ? 'text-3xl' : 'text-4xl'} mb-2 drop-shadow-sm`}>
            📦
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground capitalize`}>
            custom
          </span>
        </div>
      </div>
      
      <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground mt-4 text-center`}>
        {isMobile 
          ? '' 
          : ''
        }
      </p>
    </Card>
  );
};