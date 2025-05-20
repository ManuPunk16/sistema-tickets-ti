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
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from '@angular/fire/firestore';
import { 
  getAuth, 
  provideAuth,
  browserLocalPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  browserSessionPersistence
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
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const app = initializeApp(environment.firebase);
      // Usar configuración de caché más simple para evitar errores
      const firestore = initializeFirestore(app, {
        localCache: persistentLocalCache()
      });
      
      return firestore;
    }),
    provideAuth(() => {
      const auth = getAuth();
      // Configurar persistencia explícita - mejorado para dispositivos móviles
      try {
        const persistence = isMobile() && !isIOS() ? browserLocalPersistence : indexedDBLocalPersistence;
        auth.setPersistence(persistence).catch(err => 
          console.warn("Error configurando persistencia:", err)
        );
      } catch (err) {
        console.warn("No se pudo configurar la persistencia:", err);
      }
      return auth;
    }),
    provideStorage(() => getStorage()),
    importProvidersFrom(MatSnackBarModule)
  ],
};
