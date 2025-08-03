// src/services/storageService.ts
interface StoredObject {
  id: string;
  name: string;
  x: number;
  y: number;
  type: string;
  emoji: string;
  color: string;
  isText?: boolean;
}

interface StorageData {
  objects: StoredObject[];
  lastUpdated: string;
  version: number;
}

class StorageService {
  private readonly API_KEY = '$2a$10$4LPqPSvKZrjEKJa3NPyrb.vYJgKRiG4EzIzSJoIBXtgWbw7C7ppZK'; // Replace with your actual API key
  private readonly BIN_ID = '688f6896ae596e708fc0a5e7'; // Replace with your bin ID
  private readonly BASE_URL = 'https://api.jsonbin.io/v3/b';
  private cache: StorageData | null = null;
  private pendingOperations: Array<() => void> = [];
  private isProcessing = false;
  private lastVersion = 0;

  // Debounced save function to batch operations
  private debouncedSave = this.debounce(async () => {
    await this.processPendingOperations();
  }, 500);

  private debounce(func: Function, wait: number) {
    let timeout: NodeJS.Timeout;
    return (...args: any[]) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  async loadObjects(): Promise<StoredObject[]> {
    try {
      const response = await fetch(`${this.BASE_URL}/${this.BIN_ID}/latest`, {
        method: 'GET',
        headers: {
          'X-Master-Key': this.API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const record = data.record || { objects: [], lastUpdated: new Date().toISOString(), version: 1 };
      
      // Update cache and version
      this.cache = {
        objects: record.objects || [],
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        version: record.version || 1
      };
      this.lastVersion = this.cache.version;
      
      return this.cache.objects;
    } catch (error) {
      console.error('Error loading objects:', error);
      // Initialize cache with empty data if load fails
      this.cache = {
        objects: [],
        lastUpdated: new Date().toISOString(),
        version: 1
      };
      return [];
    }
  }

  private async processPendingOperations(): Promise<boolean> {
    if (this.isProcessing || this.pendingOperations.length === 0 || !this.cache) {
      return true;
    }

    this.isProcessing = true;
    
    try {
      // Apply all pending operations to the cache
      this.pendingOperations.forEach(operation => operation());
      this.pendingOperations = [];

      // Increment version for conflict detection
      this.cache.version = this.lastVersion + 1;
      this.cache.lastUpdated = new Date().toISOString();

      const response = await fetch(`${this.BASE_URL}/${this.BIN_ID}`, {
        method: 'PUT',
        headers: {
          'X-Master-Key': this.API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.cache),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      this.lastVersion = this.cache.version;
      return true;
    } catch (error) {
      console.error('Error saving objects:', error);
      // Reset pending operations on failure
      this.pendingOperations = [];
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  private queueOperation(operation: () => void) {
    this.pendingOperations.push(operation);
    this.debouncedSave();
  }

  async addObject(object: StoredObject): Promise<boolean> {
    if (!this.cache) {
      await this.loadObjects();
    }

    this.queueOperation(() => {
      if (this.cache) {
        // Remove any existing object with the same ID (replace)
        this.cache.objects = this.cache.objects.filter(obj => obj.id !== object.id);
        this.cache.objects.push(object);
      }
    });

    return true; // Return immediately for better UX
  }

  async updateObject(objectId: string, x: number, y: number): Promise<boolean> {
    if (!this.cache) {
      await this.loadObjects();
    }

    this.queueOperation(() => {
      if (this.cache) {
        this.cache.objects = this.cache.objects.map(obj =>
          obj.id === objectId ? { ...obj, x, y } : obj
        );
      }
    });

    return true; // Return immediately for better UX
  }

  async removeObject(objectId: string): Promise<boolean> {
    if (!this.cache) {
      await this.loadObjects();
    }

    this.queueOperation(() => {
      if (this.cache) {
        this.cache.objects = this.cache.objects.filter(obj => obj.id !== objectId);
      }
    });

    return true; // Return immediately for better UX
  }

  async syncObjects(localObjects: StoredObject[]): Promise<StoredObject[]> {
    try {
      // Load latest data from server
      const serverObjects = await this.loadObjects();
      
      // Simple merge strategy: server wins for conflicts, but preserve local additions
      const mergedObjects = [...serverObjects];
      
      // Add any local objects that don't exist on server (by ID)
      localObjects.forEach(localObj => {
        if (!serverObjects.find(serverObj => serverObj.id === localObj.id)) {
          mergedObjects.push(localObj);
        }
      });

      return mergedObjects;
    } catch (error) {
      console.error('Error syncing objects:', error);
      return localObjects; // Fallback to local data
    }
  }

  // Force immediate save (for critical operations like delete)
  async forceSave(): Promise<boolean> {
    clearTimeout((this.debouncedSave as any).timeout);
    return await this.processPendingOperations();
  }

  // Get current cache state
  getCurrentObjects(): StoredObject[] {
    return this.cache?.objects || [];
  }
}

export const storageService = new StorageService();