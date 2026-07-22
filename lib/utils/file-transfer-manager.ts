import { Capacitor } from '@capacitor/core';

export interface TransferState {
  progress: number;
  loaded: number;
  total: number;
  status: 'idle' | 'pending' | 'transferring' | 'completed' | 'failed';
  localUrl?: string;
  error?: string;
}

type Listener = (state: TransferState) => void;

class FileTransferManager {
  private transfers = new Map<string, TransferState>();
  private listeners = new Map<string, Set<Listener>>();
  private abortControllers = new Map<string, AbortController>();
  private CACHE_NAME = 'zetime-file-cache';

  constructor() {
    // Perform initial storage check if on client
    if (typeof window !== 'undefined') {
      this.initCache();
    }
  }

  private async initCache() {
    try {
      await caches.open(this.CACHE_NAME);
    } catch (e) {
      console.warn('[FileTransferManager] Cache API initialization failed:', e);
    }
  }

  // Pub-Sub subscription
  subscribe(id: string, listener: Listener): () => void {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(listener);

    // Immediately trigger callback with current state if available
    const currentState = this.transfers.get(id);
    if (currentState) {
      listener(currentState);
    } else {
      // Check if it's already cached in background
      this.checkCache(id).then(localUrl => {
        if (localUrl) {
          const completedState: TransferState = {
            progress: 100,
            loaded: 0,
            total: 0,
            status: 'completed',
            localUrl,
          };
          this.updateTransferState(id, completedState);
        }
      });
    }

    return () => this.unsubscribe(id, listener);
  }

  unsubscribe(id: string, listener: Listener) {
    const set = this.listeners.get(id);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(id);
      }
    }
  }

  private notify(id: string, state: TransferState) {
    const set = this.listeners.get(id);
    if (set) {
      set.forEach(cb => {
        try {
          cb(state);
        } catch (e) {
          console.error('[FileTransferManager] Listener error:', e);
        }
      });
    }
  }

  updateTransferState(id: string, state: Partial<TransferState>) {
    const current = this.transfers.get(id) || {
      progress: 0,
      loaded: 0,
      total: 0,
      status: 'idle',
    };
    const updated = { ...current, ...state };
    this.transfers.set(id, updated);
    this.notify(id, updated);
  }

  getTransferState(id: string): TransferState | undefined {
    return this.transfers.get(id);
  }

  // Checks if a file is already in the local cache
  async checkCache(url: string): Promise<string | null> {
    if (typeof window === 'undefined' || !('caches' in window)) return null;

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const matched = await cache.match(url);
      if (matched) {
        const blob = await matched.blob();
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.warn('[FileTransferManager] Error checking Cache API:', e);
    }
    return null;
  }

  // Starts downloading a file with real progress updates and Cache API saving
  async downloadFile(url: string, fileName: string): Promise<string> {
    // 1. Check cache first
    const cachedUrl = await this.checkCache(url);
    if (cachedUrl) {
      const completedState: TransferState = {
        progress: 100,
        loaded: 0,
        total: 0,
        status: 'completed',
        localUrl: cachedUrl,
      };
      this.updateTransferState(url, completedState);
      return cachedUrl;
    }

    // 2. Prevent duplicate downloads
    const current = this.getTransferState(url);
    if (current && current.status === 'transferring') {
      return new Promise((resolve, reject) => {
        const unsubscribe = this.subscribe(url, (state) => {
          if (state.status === 'completed' && state.localUrl) {
            unsubscribe();
            resolve(state.localUrl);
          } else if (state.status === 'failed') {
            unsubscribe();
            reject(new Error(state.error || 'Download failed'));
          }
        });
      });
    }

    // 3. Initiate download
    const controller = new AbortController();
    this.abortControllers.set(url, controller);

    this.updateTransferState(url, {
      progress: 0,
      loaded: 0,
      total: 0,
      status: 'pending',
    });

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onloadstart = () => {
        this.updateTransferState(url, { status: 'transferring' });
      };

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          this.updateTransferState(url, {
            progress,
            loaded: event.loaded,
            total: event.total,
            status: 'transferring',
          });
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const blob = xhr.response as Blob;
            
            // Save to Cache API
            const cache = await caches.open(this.CACHE_NAME);
            const response = new Response(blob, {
              headers: {
                'Content-Type': blob.type,
                'Content-Length': blob.size.toString(),
              },
            });
            await cache.put(url, response);

            const localUrl = URL.createObjectURL(blob);
            const completedState: TransferState = {
              progress: 100,
              loaded: blob.size,
              total: blob.size,
              status: 'completed',
              localUrl,
            };
            this.updateTransferState(url, completedState);
            this.abortControllers.delete(url);
            resolve(localUrl);
          } catch (e: any) {
            const failedState: TransferState = {
              progress: 0,
              loaded: 0,
              total: 0,
              status: 'failed',
              error: e.message || 'Cache save failed',
            };
            this.updateTransferState(url, failedState);
            this.abortControllers.delete(url);
            reject(e);
          }
        } else {
          const err = new Error(`Download failed with status ${xhr.status}`);
          this.updateTransferState(url, {
            progress: 0,
            loaded: 0,
            total: 0,
            status: 'failed',
            error: err.message,
          });
          this.abortControllers.delete(url);
          reject(err);
        }
      };

      xhr.onerror = () => {
        const err = new Error('Download network error');
        this.updateTransferState(url, {
          progress: 0,
          loaded: 0,
          total: 0,
          status: 'failed',
          error: err.message,
        });
        this.abortControllers.delete(url);
        reject(err);
      };

      xhr.onabort = () => {
        const err = new Error('Download cancelled');
        this.updateTransferState(url, {
          progress: 0,
          loaded: 0,
          total: 0,
          status: 'idle',
        });
        this.abortControllers.delete(url);
        reject(err);
      };

      controller.signal.addEventListener('abort', () => {
        xhr.abort();
      });

      xhr.send();
    });
  }

  cancelDownload(url: string) {
    const controller = this.abortControllers.get(url);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(url);
    }
  }
}

export const fileTransferManager = new FileTransferManager();
