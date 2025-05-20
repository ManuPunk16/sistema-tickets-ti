/**
 * Detecta si el usuario está en un dispositivo móvil
 */
export function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Mejor detección de dispositivos móviles
  const userAgent = navigator.userAgent || navigator.vendor || '';
  
  // Verificar primero si estamos en un navegador
  if (typeof window === 'undefined') return false;
  
  // Detectar por userAgent (método tradicional)
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  
  // Detectar por características de pantalla (método más moderno)
  const isTouchDevice = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       (window.matchMedia && window.matchMedia('(pointer:coarse)').matches);
  
  // Detectar por tamaño de pantalla
  const isSmallScreen = window.innerWidth < 768;
  
  // Combinamos diferentes métodos para mayor precisión
  return mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen);
}

/**
 * Detecta si estamos en un entorno iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent || '';
  return /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
}

/**
 * Detecta si estamos en un entorno Android
 */
export function isAndroid(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const userAgent = navigator.userAgent || '';
  return /Android/.test(userAgent);
}

/**
 * Detecta si el navegador soporta IndexedDB
 */
export function supportsIndexedDB(): boolean {
  try {
    return typeof window !== 'undefined' && 
           'indexedDB' in window && 
           window.indexedDB !== null;
  } catch (e) {
    return false;
  }
}

/**
 * Detecta si estamos en un entorno de servidor (SSR)
 */
export function isServer(): boolean {
  return typeof window === 'undefined';
}