declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
}

declare module 'firebase/messaging' {
  export function getMessaging(app?: any): any;
  export function getToken(messaging: any, options?: any): Promise<string>;
  export function onMessage(messaging: any, callback: (payload: any) => void): any;
}
