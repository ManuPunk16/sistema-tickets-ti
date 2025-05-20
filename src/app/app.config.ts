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

    // Provee Auth con configuración mejorada
    provideAuth(() => {
      const auth = getAuth();
      
      // Configuración de persistencia optimizada
      try {
        // En móviles Android usar localStorage, en iOS y Desktop usar IndexedDB
        const persistence = isMobile() && !isIOS() 
          ? browserLocalPersistence 
          : indexedDBLocalPersistence;
          
        auth.setPersistence(persistence)
          .catch(err => console.warn("Error configurando persistencia:", err));
          
        // Configurar un observador de cambios de estado que se activa inmediatamente
        auth.onAuthStateChanged(() => {}, (error) => {
          console.error("Error en onAuthStateChanged:", error);
        });
      } catch (err) {
        console.warn("No se pudo configurar Firebase Auth:", err);
      }
      
      return auth;
    }),

    // Provee Storage
    provideStorage(() => getStorage()),

    // Importa el módulo de MatSnackBar
    importProvidersFrom(MatSnackBarModule)
  ],
};