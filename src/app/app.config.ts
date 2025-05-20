import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import {
  initializeApp,
  provideFirebaseApp
} from '@angular/fire/app';
import {
  getFirestore,
  provideFirestore,
  // connectFirestoreEmulator, // Solo si usas emuladores
  initializeFirestore,
  persistentLocalCache,
  // persistentMultipleTabManager // Solo si necesitas soporte multi-tab
} from '@angular/fire/firestore';
import {
  getAuth,
  provideAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  // initializeAuth, // No necesitas esto aquí, getAuth() es suficiente
  // browserSessionPersistence
} from '@angular/fire/auth';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { environment } from '../environments/environment';

import { authInterceptor } from './core/interceptors/auth.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { isIOS, isMobile } from './core/utils/platform.utils';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withViewTransitions()),
    provideAnimations(),
    provideHttpClient(
      withInterceptors([authInterceptor])
    ),
    // Provee la aplicación Firebase
    provideFirebaseApp(() => initializeApp(environment.firebase)),

    // Provee Firestore
    provideFirestore(() => {
      const app = initializeApp(environment.firebase);
      // Usar configuración de caché más simple para evitar errores
      // persistentLocalCache() es adecuado para la mayoría de los casos
      const firestore = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
      // Si usas emuladores, descomenta:
      // if (environment.useEmulators) {
      //   connectFirestoreEmulator(firestore, 'localhost', 8080);
      // }
      return firestore;
    }),

    // Provee Auth
    provideAuth(() => {
      const auth = getAuth();
      // Configurar persistencia explícita - mejorado para dispositivos móviles
      // Aquí el `try...catch` es útil si hay problemas al establecer la persistencia
      try {
        const persistence = isMobile() && !isIOS() ? browserLocalPersistence : indexedDBLocalPersistence;
        auth.setPersistence(persistence)
          .catch(err =>
            // Solo advertir, no detener la app si falla la persistencia
            console.warn("Error configurando persistencia de Firebase Auth:", err)
          );
      } catch (err) {
        console.warn("No se pudo configurar la persistencia de Firebase Auth (catch externo):", err);
      }
      return auth;
    }),

    // Provee Storage
    provideStorage(() => getStorage()),

    // Importa el módulo de MatSnackBar
    importProvidersFrom(MatSnackBarModule)
  ],
};