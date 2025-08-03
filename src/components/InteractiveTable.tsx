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
const TABLE_BASE_WIDTH = 800;
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

  // Centralized mobile detection and scaling
  useEffect(() => {
    const updateLayout = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const padding = mobile ? 16 : 24;
        const availableWidth = containerWidth - (padding * 2);
        
        // Calculate scale to maintain aspect ratio
        const maxScale = mobile ? 0.9 : 1.0;
        const scale = Math.min(availableWidth / TABLE_BASE_WIDTH, maxScale);
        setTableScale(scale);
      }
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, []);

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
        if (storedObjects.length > 0) {
          toast.success(`Loaded ${storedObjects.length} objects`);
        }
      } catch (error) {
        console.error('Failed to load objects:', error);
        toast.error('Failed to load saved objects');
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredObjects();
  }, []);

  // Fixed periodic sync - stable dependency array
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;
    
    const performSync = async () => {
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
    };

    syncInterval = setInterval(performSync, 10000); // Reduced frequency for API limits
    return () => clearInterval(syncInterval);
  }, []); // Empty dependency array prevents recreation

  // Handle adding objects from palette
  const handleAddObject = async (objectData: any, position?: { x: number; y: number }) => {
    const { type, emoji, color, isText } = objectData;
    
    // Default to center if no position provided
    const x = position?.x ?? (TABLE_BASE_WIDTH / 2 - 30);
    const y = position?.y ?? (TABLE_BASE_HEIGHT / 2 - 30);
    
    // Keep within bounds
    const boundedX = Math.max(0, Math.min(x, TABLE_BASE_WIDTH - 60));
    const boundedY = Math.max(0, Math.min(y, TABLE_BASE_HEIGHT - 60));
    
    const newObject: TableObject = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      emoji,
      color,
      x: boundedX,
      y: boundedY,
      isText
    };
    
    setObjects(prev => [...prev, newObject]);
    
    setIsSaving(true);
    try {
      await storageService.addObject(tableObjectToStored(newObject));
      toast.success(`${emoji} added`);
    } catch (error) {
      toast.error('Failed to save object');
      setObjects(prev => prev.filter(obj => obj.id !== newObject.id));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!tableRef.current) return;
    
    const objectData = e.dataTransfer.getData("application/json");
    if (!objectData) return;
    
    const parsedData = JSON.parse(objectData);
    const tableRect = tableRef.current.getBoundingClientRect();
    
    // Convert screen coordinates to table coordinates
    const x = (e.clientX - tableRect.left) / tableScale - 30;
    const y = (e.clientY - tableRect.top) / tableScale - 30;
    
    await handleAddObject(parsedData, { x, y });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
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
        toast.success(`${removedObject.emoji} removed`);
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

  // Improved custom object creation
  const handleCustomObject = async (input: string) => {
    const trimmed = input.trim();

    if (trimmed === "__reset") {
      // Reset remote storage and local state
      await storageService.resetObjects();
      setObjects([]);
      toast.success("Table has been reset!");
      return null; // Prevent adding an object
    }

    // ...existing code...
    const isSingleChar = Array.from(trimmed).length === 1;
    const isEmoji = isSingleChar || /[\p{Emoji}\u{1F000}-\u{1F9FF}]/u.test(trimmed);

    return {
      type: isEmoji ? "custom-emoji" : "paper",
      emoji: trimmed,
      color: isEmoji ? "bg-purple-600" : "bg-white",
      isText: !isEmoji
    };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your table...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-none px-4 py-6" ref={containerRef}>
        <div className="mb-6 text-center">
          <h1 className={`${isMobile ? 'text-2xl' : 'text-4xl'} font-bold text-foreground mb-2`}>
            
          </h1>
          <p className={`text-muted-foreground ${isMobile ? 'text-sm' : 'text-lg'}`}>
            {isMobile ? '' : ''}
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

        <div className="mb-8">
          <ObjectPalette 
            objects={OBJECT_TYPES} 
            onCustomObject={handleCustomObject}
            onAddObject={handleAddObject}
            isMobile={isMobile}
          />
        </div>
        
        <div className="flex justify-center">
          <div
            ref={tableRef}
            className="relative bg-gradient-to-br from-table-surface to-table-shadow rounded-3xl shadow-2xl border-8 border-amber-900/20 touch-none"
            style={{
              width: `${TABLE_BASE_WIDTH * tableScale}px`,
              height: `${TABLE_BASE_HEIGHT * tableScale}px`,
              background: `
                radial-gradient(ellipse at center, hsl(var(--table-surface)), hsl(var(--table-shadow))),
                linear-gradient(45deg, transparent 25%, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.02) 50%, transparent 50%, transparent 75%, rgba(0,0,0,0.02) 75%)
              `,
              backgroundSize: "100% 100%, 40px 40px"
            }}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{objects.length} objects</p>
          {isMobile && (
            <p className="text-xs mt-1">Scale: {Math.round(tableScale * 100)}%</p>
          )}
        </div>
      </div>
    </div>
  );
};