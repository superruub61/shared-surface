import React from "react";
import { Card } from "@/components/ui/card";

interface ObjectType {
  type: string;
  emoji: string;
  color: string;
}

interface ObjectPaletteProps {
  objects: ObjectType[];
  onCustomEmoji: (input: string, isJustEmoji: boolean) => ObjectType & { isText?: boolean };
}

export const ObjectPalette = ({ objects, onCustomEmoji }: ObjectPaletteProps) => {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragStart = (e: React.DragEvent, object: ObjectType) => {
    e.dataTransfer.setData("application/json", JSON.stringify(object));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleObjectClick = (object: ObjectType) => {
    if (isMobile) {
      
      <p className={`${isMobile ? 'text-xs' : 'text-xs'} text-muted-foreground mt-4 text-center`}>
        {isMobile 
          ? 'Tap objects to add them to the table center' 
          : 'Drag objects onto the table to place them. Enter emojis for objects or text for paper notes.'
        }
      </p>
    </Card>
  );
};// On mobile, dispatch event to add object to center of table
      const customEvent = new CustomEvent('customEmoji', { detail: object });
      window.dispatchEvent(customEvent);
    }
  };

  const handleEmojiPicker = () => {
    const input = prompt("Enter an emoji or text:");
    if (input && input.trim()) {
      const trimmedInput = input.trim();
      
      const customObject = onCustomEmoji(trimmedInput, false);
      const customEvent = new CustomEvent('customEmoji', { detail: customObject });
      window.dispatchEvent(customEvent);
    }
  };

  return (
    <Card className="p-4 md:p-6 bg-card/50 backdrop-blur-sm border-2">
      <div className="mb-4">
        <h2 className={`${isMobile ? 'text-lg' : 'text-xl'} font-semibold text-foreground`}>
          Items
        </h2>
      </div>
      
      <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'} gap-3 md:gap-4`}>
        {objects.map((object) => (
          <div
            key={object.type}
            draggable={!isMobile}
            onDragStart={(e) => handleDragStart(e, object)}
            onClick={() => handleObjectClick(object)}
            className={`flex flex-col items-center p-3 md:p-4 rounded-xl bg-white/80 shadow-lg border-2 border-border hover:border-primary/50 hover:shadow-xl transition-all duration-200 hover:scale-105 ${
              isMobile ? 'cursor-pointer active:scale-95' : 'cursor-grab active:cursor-grabbing'
            }`}
          >
            <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} mb-2 drop-shadow-sm`}>
              {object.emoji}
            </div>
            <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground capitalize`}>
              {object.type}
            </span>
          </div>
        ))}
        <div
          onClick={handleEmojiPicker}
          className={`flex flex-col items-center p-3 md:p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 shadow-lg border-2 border-dashed border-purple-300 hover:border-purple-500 hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-105 ${
            isMobile ? 'active:scale-95' : ''
          }`}
        >
          <div className={`${isMobile ? 'text-2xl' : 'text-4xl'} mb-2 drop-shadow-sm`}>
            📦
          </div>
          <span className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-foreground capitalize`}>
            custom
          </span>
        </div>
      </div>
      
      import { Card } from "@/components/ui/card";

interface ObjectType {
  type: string;
  emoji: string;
  color: string;
}

interface ObjectPaletteProps {
  objects: ObjectType[];
  onCustomEmoji: (input: string, isJustEmoji: boolean) => ObjectType & { isText?: boolean };
}

export const ObjectPalette = ({ objects, onCustomEmoji }: ObjectPaletteProps) => {
  const handleDragStart = (e: React.DragEvent, object: ObjectType) => {
    e.dataTransfer.setData("application/json", JSON.stringify(object));
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleEmojiPicker = () => {
    const input = prompt("Enter an emoji or text:");
    if (input && input.trim()) {
      const trimmedInput = input.trim();
      
      const customObject = onCustomEmoji(trimmedInput, false); // Let the parent handle detection
      const customEvent = new CustomEvent('customEmoji', { detail: customObject });
      window.dispatchEvent(customEvent);
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur-sm border-2">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-foreground">Items</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        {objects.map((object) => (
          <div
            key={object.type}
            draggable
            onDragStart={(e) => handleDragStart(e, object)}
            className="flex flex-col items-center p-4 rounded-xl bg-white/80 shadow-lg border-2 border-border hover:border-primary/50 hover:shadow-xl cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105"
          >
            <div className="text-4xl mb-2 drop-shadow-sm">
              {object.emoji}
            </div>
            <span className="text-sm font-medium text-foreground capitalize">
              {object.type}
            </span>
          </div>
        ))}
        <div
          onClick={handleEmojiPicker}
          className="flex flex-col items-center p-4 rounded-xl bg-gradient-to-br from-purple-100 to-purple-200 shadow-lg border-2 border-dashed border-purple-300 hover:border-purple-500 hover:shadow-xl cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <div className="text-4xl mb-2 drop-shadow-sm">
            📦
          </div>
          <span className="text-sm font-medium text-foreground capitalize">
            custom
          </span>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground mt-4 text-center">
        Drag objects onto the table to place them. Enter emojis for objects or text for paper notes.
      </p>
    </Card>
  );
};