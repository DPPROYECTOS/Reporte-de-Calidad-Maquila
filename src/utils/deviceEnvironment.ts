/**
 * Detección de Entorno de Ejecución (Handheld Zebra TC26 / APK vs. Web Desktop / AI Studio / GitHub Pages)
 * 
 * Permite identificar si la app se ejecuta dentro de:
 * 1. La APK instalada en Android (PWABuilder / TWA) mediante document.referrer ('android-app://')
 * 2. Modo aplicación standalone en Android (sin barra de navegador)
 * 3. Terminal portátil industrial Handheld Zebra TC26 (User-Agent específico)
 * 4. Contenedor WebView / App empaquetada de Android
 */

export interface DeviceEnvironmentInfo {
  /** Método 1: document.referrer contiene 'android-app://' */
  isApkReferrer: boolean;
  /** Método 2: Modo standalone / fullscreen en dispositivo Android */
  isAndroidStandalone: boolean;
  /** Método 3: Firma de hardware Zebra TC26 o terminal industrial en User-Agent */
  isZebraHandheld: boolean;
  /** Método 4: Android WebView o puente de app nativa */
  isAndroidWebViewOrApk: boolean;
  /** Verdadero si cumple CUALQUIERA de los 4 métodos (está en APK o en Handheld TC26) */
  isHandheldOrApk: boolean;
  /** Verdadero si es una computadora de escritorio (Windows / Mac / Linux PC) */
  isDesktopComputer: boolean;
  /** Nombre descriptivo del entorno detectado */
  environmentName: string;
}

export function detectDeviceEnvironment(): DeviceEnvironmentInfo {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isApkReferrer: false,
      isAndroidStandalone: false,
      isZebraHandheld: false,
      isAndroidWebViewOrApk: false,
      isHandheldOrApk: false,
      isDesktopComputer: true,
      environmentName: 'Servidor / SSR',
    };
  }

  // Soporte de prueba y depuración vía parámetro URL (ejemplo: ?env=apk o ?env=web)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const envParam = urlParams.get('env')?.toLowerCase();
    if (envParam === 'apk' || envParam === 'tc26' || envParam === 'handheld') {
      return {
        isApkReferrer: true,
        isAndroidStandalone: true,
        isZebraHandheld: true,
        isAndroidWebViewOrApk: true,
        isHandheldOrApk: true,
        isDesktopComputer: false,
        environmentName: 'Simulación Handheld TC26 / APK (?env=apk)',
      };
    } else if (envParam === 'web' || envParam === 'desktop') {
      return {
        isApkReferrer: false,
        isAndroidStandalone: false,
        isZebraHandheld: false,
        isAndroidWebViewOrApk: false,
        isHandheldOrApk: false,
        isDesktopComputer: true,
        environmentName: 'Simulación Web Desktop (?env=web)',
      };
    }
  } catch {
    // Ignorar si la URL no es accesible
  }

  const userAgent = navigator.userAgent || '';
  const isAndroid = /Android/i.test(userAgent);

  // Método 1: Detección de la APK de Android mediante document.referrer
  // Las aplicaciones creadas con PWABuilder / TWA o APK lanzan el navegador con 'android-app://<package_name>'
  const isApkReferrer =
    typeof document !== 'undefined' &&
    typeof document.referrer === 'string' &&
    document.referrer.startsWith('android-app://');

  // Método 2: Detección de modo Standalone en Android (display-mode: standalone / fullscreen)
  // La APK instalada se ejecuta en modo aplicación sin controles de navegador (barra de URL)
  const isStandaloneMatch =
    (typeof window.matchMedia === 'function' &&
      (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches)) ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;
  const isAndroidStandalone = isAndroid && Boolean(isStandaloneMatch);

  // Método 3: Detección específica de la Handheld Zebra TC26 / dispositivos industriales
  // Las terminales Zebra incluyen 'TC26', 'TC25', 'TC21', 'TC52', 'TC57' o la marca 'Zebra' en el User Agent
  const isZebraHandheld = /TC26|TC25|TC21|TC20|TC52|TC57|TC58|TC77|Zebra|Handheld|Symbol/i.test(userAgent);

  // Método 4: Detección de Android WebView / empaquetado de APK nativo
  // Los WebViews en Android incluyen '; wv' o patrones de empaquetado de app nativa
  const isAndroidWebViewOrApk =
    isAndroid &&
    (/;\s*wv\b|Version\/[\d.]+.*Chrome/i.test(userAgent) ||
      Boolean((window as unknown as { Android?: unknown }).Android) ||
      Boolean((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView));

  // Combinación: ¿Está corriendo en la Handheld TC26 o como APK instalada?
  const isHandheldOrApk =
    isApkReferrer || isAndroidStandalone || isZebraHandheld || isAndroidWebViewOrApk;

  // Detección de computadora de escritorio (Windows, Mac, Linux que no sea móvil)
  const isDesktopComputer = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  let environmentName = 'Navegador Web';
  if (isZebraHandheld) {
    environmentName = 'Handheld Zebra TC26';
  } else if (isApkReferrer || isAndroidWebViewOrApk) {
    environmentName = 'APK Android Instalada';
  } else if (isAndroidStandalone) {
    environmentName = 'PWA Android Standalone';
  } else if (isDesktopComputer) {
    environmentName = 'Computadora de Escritorio (PC / Web)';
  }

  return {
    isApkReferrer,
    isAndroidStandalone,
    isZebraHandheld,
    isAndroidWebViewOrApk,
    isHandheldOrApk,
    isDesktopComputer,
    environmentName,
  };
}
