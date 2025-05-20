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
  connectAuthEmulator,
  browserLocalPersistence
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
      
      // No intentamos configurar la persistencia aquí para evitar errores
      // La persistencia de autenticación es manejada automáticamente por Firebase
      
      return auth;
    }),
    provideStorage(() => getStorage()),
    importProvidersFrom(MatSnackBarModule)
  ],
};
