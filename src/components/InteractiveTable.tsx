import React, { useState, useRef, useEffect } from "react";
import { ObjectPalette } from "./ObjectPalette";
import { DraggableObject } from "./DraggableObject";
import { toast } from "sonner";
import { storageService } from "../services/storageService";

export interface TableObject {
  id: string;
  type: string;
  emoji: string;
  color: string;
  x: number;
  y: number;
  isText?: boolean;
}

const OBJECT_TYPES = [
  { type: "cup", emoji: "☕", color: "bg-amber-600" },
  { type: "book", emoji: "📚", color: "bg-blue-600" },
  { type: "phone", emoji: "📱", color: "bg-gray-800" },
  { type: "plant", emoji: "🌱", color: "bg-green-600" },
  { type: "lamp", emoji: "💡", color: "bg-yellow-500" },
];

// Fixed table aspect ratio (4:3 - width:height)
const TABLE_ASPECT_RATIO = 4 / 3;
const TABLE_BASE_WIDTH = 800; // Base width for calculations
const TABLE_BASE_HEIGHT = TABLE_BASE_WIDTH / TABLE_ASPECT_RATIO; // 600px

export const InteractiveTable = () => {
  const [objects, setObjects] = useState<TableObject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [tableScale, setTableScale] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  // Detect mobile device and calculate scale
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const padding = mobile ? 16 : 24; // Account for padding
        const availableWidth = containerWidth - (padding * 2);
        
        // Calculate scale to fit table width
        const scale = Math.min(availableWidth / TABLE_BASE_WIDTH, 1);
        setTableScale(scale);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Convert screen coordinates to table coordinates
  const screenToTable = (screenX: number, screenY: number) => {
    if (!tableRef.current) return { x: 0, y: 0 };
    
    const rect = tableRef.current.getBoundingClientRect();
    const x = (screenX - rect.left) / tableScale;
    const y = (screenY - rect.top) / tableScale;
    
    return { x, y };
  };

  // Convert table coordinates to screen coordinates  
  const tableToScreen = (tableX: number, tableY: number) => {
    return {
      x: tableX * tableScale,
      y: tableY * tableScale
    };
  };

  // Helper function to convert TableObject to StoredObject
  const tableObjectToStored = (obj: TableObject) => ({
    id: obj.id,
    name: obj.type,
    x: obj.x,
    y: obj.y,
    type: obj.type,
    emoji: obj.emoji,
    color: obj.color,
    isText: obj.isText,
  });

  // Load objects from storage on component mount
  useEffect(() => {
    const loadStoredObjects = async () => {
      try {
        setIsLoading(true);
        const storedObjects = await storageService.loadObjects();
        setObjects(storedObjects);
        setLastSyncTime(new Date());
        toast.success(`Loaded ${storedObjects.length} objects from storage`);
      } catch (error) {
        console.error('Failed to load objects:', error);
        toast.error('Failed to load saved objects');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredObjects();
  }, []);

  // Periodic sync to catch changes from other users
  useEffect(() => {
    syncIntervalRef.current = setInterval(async () => {
      try {
        const currentObjects = objects.map(tableObjectToStored);
        const syncedObjects = await storageService.syncObjects(currentObjects);
        
        if (JSON.stringify(syncedObjects) !== JSON.stringify(currentObjects)) {
          setObjects(syncedObjects);
          setLastSyncTime(new Date());
        }
      } catch (error) {
        console.error('Background sync failed:', error);
      }
    }, 5000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [objects]);

  // Handle custom emoji events
  useEffect(() => {
    const handleCustomEmoji = async (event: CustomEvent) => {
      const customObject = event.detail;
      if (!tableRef.current) return;
      
      const centerX = TABLE_BASE_WIDTH / 2 - 30;
      const centerY = TABLE_BASE_HEIGHT / 2 - 30;
      
      const newObject: TableObject = {
        id: `${customObject.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: customObject.type,
        emoji: customObject.emoji,
        color: customObject.color,
        x: centerX,
        y: centerY,
        isText: customObject.isText
      };
      
      setObjects(prev => [...prev, newObject]);
      
      setIsSaving(true);
      try {
        await storageService.addObject(tableObjectToStored(newObject));
        toast.success(`${customObject.emoji} added and saved`);
      } catch (error) {
        toast.error('Failed to save object');
        setObjects(prev => prev.filter(obj => obj.id !== newObject.id));
      } finally {
        setIsSaving(false);
      }
    };

    window.addEventListener('customEmoji', handleCustomEmoji as EventListener);
    return () => window.removeEventListener('customEmoji', handleCustomEmoji as EventListener);
  }, []);

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!tableRef.current) return;
    
    const objectData = e.dataTransfer.getData("application/json");
    if (!objectData) return;
    
    const { type, emoji, color, isText } = JSON.parse(objectData);
    
    // Convert screen coordinates to table coordinates
    const { x: tableX, y: tableY } = screenToTable(e.clientX, e.clientY);
    
    // Adjust for object center and keep within bounds
    const x = Math.max(0, Math.min(tableX - 30, TABLE_BASE_WIDTH - 60));
    const y = Math.max(0, Math.min(tableY - 30, TABLE_BASE_HEIGHT - 60));
    
    const newObject: TableObject = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      emoji,
      color,
      x,
      y,
      isText
    };
    
    setObjects(prev => [...prev, newObject]);
    
    setIsSaving(true);
    try {
      await storageService.addObject(tableObjectToStored(newObject));
      toast.success(`${emoji} ${type} placed and saved`);
    } catch (error) {
      toast.error('Failed to save object');
      setObjects(prev => prev.filter(obj => obj.id !== newObject.id));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // Handle touch for mobile
  const handleTouchStart = async (e: React.TouchEvent) => {
    if (!isMobile) return;
    
    // Simple tap to add default object on mobile
    const touch = e.touches[0];
    const { x: tableX, y: tableY } = screenToTable(touch.clientX, touch.clientY);
    
    const x = Math.max(0, Math.min(tableX - 30, TABLE_BASE_WIDTH - 60));
    const y = Math.max(0, Math.min(tableY - 30, TABLE_BASE_HEIGHT - 60));
    
    // Add a default cup object
    const newObject: TableObject = {
      id: `tap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "cup",
      emoji: "☕",
      color: "bg-amber-600",
      x,
      y,
      isText: false
    };
    
    setObjects(prev => [...prev, newObject]);
    
    try {
      await storageService.addObject(tableObjectToStored(newObject));
      toast.success("☕ added");
    } catch (error) {
      toast.error('Failed to save object');
      setObjects(prev => prev.filter(obj => obj.id !== newObject.id));
    }
  };

  const handleObjectMove = async (id: string, newX: number, newY: number) => {
    const oldObject = objects.find(obj => obj.id === id);
    
    setObjects(prev => 
      prev.map(obj => 
        obj.id === id ? { ...obj, x: newX, y: newY } : obj
      )
    );

    try {
      await storageService.updateObject(id, newX, newY);
    } catch (error) {
      console.error('Failed to save object position:', error);
      if (oldObject) {
        setObjects(prev => 
          prev.map(obj => 
            obj.id === id ? { ...obj, x: oldObject.x, y: oldObject.y } : obj
          )
        );
        toast.error('Failed to save position');
      }
    }
  };

  const handleRemoveObject = async (id: string) => {
    const removedObject = objects.find(obj => obj.id === id);
    
    setObjects(prev => prev.filter(obj => obj.id !== id));
    
    setIsSaving(true);
    try {
      await storageService.removeObject(id);
      await storageService.forceSave();
      
      if (removedObject) {
        toast.success(`${removedObject.emoji} ${removedObject.type} removed`);
      }
    } catch (error) {
      toast.error('Failed to remove object');
      if (removedObject) {
        setObjects(prev => [...prev, removedObject]);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCustomEmoji = (input: string, isJustEmoji: boolean) => {
    const cleanInput = input.replace(/\s/g, '');
    const emojiRegex = /^[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]$/u;
    const isSingleEmoji = emojiRegex.test(cleanInput) && cleanInput.length <= 4;
    const emojiCount = [...cleanInput].filter(char => 
      /[\p{Emoji}\p{Emoji_Modifier}\p{Emoji_Component}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/u.test(char)
    ).length;
    const isExactlyOneEmoji = isSingleEmoji && emojiCount === 1;
    
    const customObject = {
      type: isExactlyOneEmoji ? "custom-emoji" : "paper",
      emoji: isExactlyOneEmoji ? cleanInput : input.trim(),
      color: isExactlyOneEmoji ? "bg-purple-600" : "bg-white",
      isText: !isExactlyOneEmoji
    };
    return customObject;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading table objects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-none px-4 py-6" ref={containerRef}>
        <div className="mb-6 text-center">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-foreground mb-2`}>
            Interactive Table
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>
            {isMobile ? 'Tap to add objects. Double-tap to remove.' : 'Drag objects from the palette onto the table. Double-click objects to remove them.'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-2">
            {isSaving && (
              <p className="text-sm text-blue-600 flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Saving...
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Last synced: {lastSyncTime.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {!isMobile && (
          <div className="mb-8">
            <ObjectPalette objects={OBJECT_TYPES} onCustomEmoji={handleCustomEmoji} />
          </div>
        )}
        
        <div className="flex justify-center">
          <div
            ref={tableRef}
            className="relative bg-gradient-to-br from-table-surface to-table-shadow rounded-3xl shadow-2xl border-8 border-amber-900/20 touch-none"
            style={{
              width: `${TABLE_BASE_WIDTH * tableScale}px`,
              height: `${TABLE_BASE_HEIGHT * tableScale}px`,
              transform: `scale(1)`, // Ensure no additional scaling
              transformOrigin: 'center top',
              background: `
                radial-gradient(ellipse at center, hsl(var(--table-surface)), hsl(var(--table-shadow))),
                linear-gradient(45deg, transparent 25%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 50%, transparent 50%, transparent 75%, rgba(0,0,0,0.02) 75%)
              `,
              backgroundSize: "100% 100%, 40px 40px"
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onTouchStart={handleTouchStart}
          >
            <div className="absolute inset-4 border-2 border-amber-900/10 rounded-2xl"></div>
            
            {objects.map((object) => (
              <DraggableObject
                key={object.id}
                object={object}
                onMove={handleObjectMove}
                onRemove={handleRemoveObject}
                tableRef={tableRef}
                scale={tableScale}
                isMobile={isMobile}
              />
            ))}
            
            <div className="absolute bottom-4 right-4 pointer-events-none">
              <div className="text-muted-foreground/20">
                <p className={`${isMobile ? 'text-lg' : 'text-4xl'} font-bold tracking-wider`}>
                  THE TABLE
                </p>
              </div>
            </div>
          </div>
        </div>

        {isMobile && (
          <div className="mt-6">
            <ObjectPalette objects={OBJECT_TYPES} onCustomEmoji={handleCustomEmoji} />
          </div>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Objects on table: {objects.length}</p>
          {isMobile && (
            <p className="text-xs mt-1">Scale: {Math.round(tableScale * 100)}%</p>
          )}
        </div>
      </div>
    </div>
  );
};