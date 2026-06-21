"use client"

if (typeof window !== 'undefined' && !(window as any).__zt_fetch_intercepted) {
  const originalFetch = window.fetch;
  
  window.fetch = async function(...args) {
    let [resource, config] = args;
    config = config || {};
    
    let url = "";
    if (typeof resource === 'string') {
      url = resource;
    } else if (resource instanceof URL) {
      url = resource.toString();
    } else if (resource instanceof Request) {
      url = resource.url;
    }

    // Only append credentials to our own API
    if (url.includes('/api/')) {
      if (typeof resource === 'string' || resource instanceof URL) {
        config.credentials = 'include';
        args[1] = config;
      } else if (resource instanceof Request) {
        config.credentials = 'include';
        args[1] = config;
      }
    }
    
    return originalFetch.apply(this, args);
  };
  
  // Mark as intercepted to avoid double wrapping on HMR
  (window as any).__zt_fetch_intercepted = true;
}

/**
 * Global fetch interceptor to automatically attach cookies (credentials: 'include')
 * to all outgoing API requests to the backend. This allows us to use HTTP-Only 
 * cookies for authentication without manually updating 150+ fetch calls.
 */
export function FetchInterceptor({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
