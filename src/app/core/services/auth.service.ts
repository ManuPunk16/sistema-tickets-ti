import { Injectable, NgZone, inject, Injector } from '@angular/core';
import { runInInjectionContext } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  signInWithRedirect,
  getRedirectResult,
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError, throwError, tap, BehaviorSubject, timeout } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';
import { isMobile } from '../utils/platform.utils';
import { authState } from 'rxfire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  user$: Observable<any>;
  currentAuthUser: any = null;
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'empresa.com'];

  private authInitialized = false;
  private injector = inject(Injector);

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private zone: NgZone
  ) {
    this.user$ = authState(this.auth);
  }

  // Método para ejecutar código dentro del contexto de inyección
  private runSafely<T>(fn: () => Promise<T>): Observable<T> {
    return from(new Promise<T>((resolve, reject) => {
      runInInjectionContext(this.injector, async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    }));
  }

  // Método específico para manejar el resultado de redirección de manera segura
  checkRedirectResult(): Observable<UserCredential | null> {
    return this.runSafely(async () => {
      console.log('Verificando resultados de redirección...');
      try {
        const result = await getRedirectResult(this.auth);
        console.log('Resultado de redirección:', result);
        console.log('Resultado de redirección:', result ? 'Encontrado' : 'No encontrado');
        return result;
      } catch (error) {
        console.error('Error en getRedirectResult:', error);
        return null;
      }
    });
  }

  getCurrentUser(): Observable<UserProfile | null> {
    return this.userProfileSubject.asObservable();
  }

  // Añadir este método para obtener el usuario actual de forma sincrónica
  getCurrentUserSync(): UserProfile | null {
    return this.userProfileSubject.getValue();
  }

  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return { uid: docSnap.id, ...docSnap.data() } as UserProfile;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error obteniendo perfil de usuario:', error);
        return of(null);
      })
    );
  }

  registerUser(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(credential => {
        return this.getUserRole(credential.user.uid).pipe(
          switchMap(role => {
            if (role === 'inactive') {
              return this.logout().pipe(
                switchMap(() => throwError(() => new Error('Su cuenta ha sido desactivada. Contacte al administrador')))
              );
            }
            if (role === 'pending') {
              return this.logout().pipe(
                switchMap(() => throwError(() => new Error('Su cuenta está pendiente de aprobación')))
              );
            }

            this.updateLastLogin(credential.user.uid);
            return of(credential);
          })
        );
      })
    );
  }

  loginWithGoogle(): Observable<UserCredential | null> {
    try {
      const provider = new GoogleAuthProvider();
      
      // Añadimos más parámetros para ayudar con problemas de autenticación
      provider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'offline',
        include_granted_scopes: 'true',
        // Más importante, asegúrate que coincida con tu dominio
        login_hint: 'user@gmail.com'
      });

      if (this.isMobileDevice()) {
        console.log("Detectado dispositivo móvil, usando signInWithRedirect");
        
        // Guardamos información en sessionStorage para saber que venimos de una redirección
      try {
        sessionStorage.setItem('auth_redirect_pending', 'true');
        console.log("Marcador de redirección guardado");
      } catch (e) {
        console.warn("No se pudo guardar estado en sessionStorage:", e);
      }
      
      return this.runSafely(async () => {
        try {
          // Registramos el tiempo exacto
          sessionStorage.setItem('auth_redirect_time', Date.now().toString());
          
          // Limpiar estado anterior
          await this.auth.signOut().catch(e => console.warn('Error en signOut previo:', e));
          
          // Iniciar redirección
          await signInWithRedirect(this.auth, provider);
          console.log("Redirección iniciada...");
          
          // Esta línea normalmente no se ejecuta por la redirección
          return null;
        } catch (error) {
          console.error("Error en signInWithRedirect:", error);
          throw error;
        }
      });
      } else {
        console.log("Detectado dispositivo de escritorio, usando signInWithPopup");
        // Mantén la lógica existente para popup
        return from(signInWithPopup(this.auth, provider))
          .pipe(
            switchMap(result => {
              if (!result) {
                return throwError(() => new Error('No se pudo completar el inicio de sesión con Google'));
              }

              const user = result.user;

              if (!this.isAllowedDomain(user.email)) {
                return this.logout().pipe(
                  switchMap(() => throwError(() => new Error('Solo se permiten correos corporativos o dominios autorizados')))
                );
              }

              // La lógica para crear perfil, validar rol, y manejar estados
              // 'pending'/'inactive' es correcta aquí para signInWithPopup.
              // Se asume que initializeAuth() (con authState) manejará esto para signInWithRedirect
              return this.getUserRole(user.uid).pipe(
                switchMap(role => {
                  if (!role) {
                    return this.createUserProfile(user.uid, {
                      uid: user.uid,
                      email: user.email,
                      displayName: user.displayName || user.email?.split('@')[0] || '',
                      photoURL: user.photoURL,
                      role: 'pending',
                      createdAt: new Date().toISOString(),
                      authProvider: 'google'
                    }).pipe(
                      switchMap(() => this.logout()),
                      switchMap(() => throwError(() => new Error('Su cuenta ha sido creada pero requiere aprobación por un administrador')))
                    );
                  } else if (role === 'inactive') {
                    return this.logout().pipe(
                      switchMap(() => throwError(() => new Error('Su cuenta ha sido desactivada. Contacte al administrador')))
                    );
                  } else if (role === 'pending') {
                    return this.logout().pipe(
                      switchMap(() => throwError(() => new Error('Su cuenta está pendiente de aprobación por un administrador')))
                    );
                  }

                  this.updateLastLogin(user.uid);
                  return of(result);
                })
              );
            }),
            catchError(error => {
              console.error("Error en signInWithPopup:", error);
              if (error.code === 'auth/popup-closed-by-user') {
                return throwError(() => new Error('Inicio de sesión cancelado por el usuario'));
              }
              return throwError(() => error);
            })
          );
      }
    } catch (error) {
      console.error("Error general en loginWithGoogle:", error);
      return throwError(() => error);
    }
  }

  logout() {
    this.userProfileSubject.next(null);
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.zone.run(() => { // Asegúrate de que la navegación esté en la zona
          this.router.navigate(['/auth/login']);
        });
      })
    );
  }

  resetPassword(email: string) {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  updateProfile(uid: string, data: Partial<UserProfile>) {
    const userRef = doc(this.firestore, 'users', uid);
    return from(updateDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }));
  }

  createUserProfile(uid: string, data: any): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(setDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }));
  }

  private isMobileDevice(): boolean {
    return isMobile();
  }

  private isAllowedDomain(email: string | null): boolean {
    if (!email) return false;
    if (this.ALLOWED_DOMAINS.length === 0) return true;
    const domain = email.split('@')[1];
    return this.ALLOWED_DOMAINS.includes(domain);
  }

  private getUserRole(uid: string): Observable<string | null> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return docSnap.data()['role'];
        }
        return null;
      }),
      catchError(() => of(null))
    );
  }

  private updateLastLogin(uid: string): void {
    const userRef = doc(this.firestore, 'users', uid);
    updateDoc(userRef, {
      lastLogin: new Date().toISOString()
    }).catch(error => console.error('Error updating last login:', error));
  }

  isLoggedIn(): boolean {
    const firebaseUser = this.auth.currentUser || this.currentAuthUser;
    const appUser = this.userProfileSubject.getValue();
    
    console.log('isLoggedIn check:', { 
      firebaseUser: firebaseUser ? `${firebaseUser.email} (${firebaseUser.uid})` : 'null', 
      appUser: appUser ? `${appUser.email} (${appUser.role})` : 'null',
      authInitialized: this.authInitialized
    });
    
    // Si no está inicializado, no podemos estar seguros
    if (!this.authInitialized) {
      console.log('Auth no inicializada completamente, verificando usuario de Firebase');
      return !!firebaseUser; // Al menos verificamos si hay usuario de Firebase
    }
    
    // Verificación completa cuando está inicializado
    return !!firebaseUser && !!appUser;
  }

  isAuthInitialized(): boolean {
    return this.authInitialized;
  }

  initializeAuth(): Observable<void> {
    if (this.authInitialized) {
      return of(void 0);
    }

    return new Observable<void>(observer => {
      console.log('Iniciando autenticación...');

      // Primero verifica si hay resultados de redirección pendientes
      this.checkRedirectResult().subscribe({
        next: redirectResult => {
          if (redirectResult && redirectResult.user) {
            console.log('Usuario autenticado por redirección:', redirectResult.user.email);
            
            // Procesa el usuario de la redirección
            this.processRedirectUser(redirectResult.user).subscribe({
              next: () => {
                // Continúa con la inicialización normal
                this.setupAuthStateListener(observer);
              },
              error: err => {
                console.error('Error al procesar usuario de redirección:', err);
                // Aún así, continúa con la inicialización
                this.setupAuthStateListener(observer);
              }
            });
          } else {
            // No hay resultado de redirección, continuar normalmente
            this.setupAuthStateListener(observer);
          }
        },
        error: err => {
          console.error('Error al verificar resultado de redirección:', err);
          // Continúa con la inicialización aunque haya error
          this.setupAuthStateListener(observer);
        }
      });
    }).pipe(
      timeout(15000), // Aumentamos el timeout para dar más margen
      catchError(err => {
        console.error('Timeout o error en inicialización de autenticación:', err);
        this.authInitialized = true;
        return of(void 0);
      })
    );
  }

  // Método auxiliar para configurar el listener de estado de autenticación
  private setupAuthStateListener(observer: any): void {
    this.runSafely(async () => {
      const unsubscribe = this.auth.onAuthStateChanged(firebaseUser => {
        console.log('Estado de autenticación detectado:', firebaseUser?.email || 'No autenticado');
        this.currentAuthUser = firebaseUser;
        
        this.zone.run(() => {
          if (firebaseUser) {
            // Si el usuario es nuevo y viene de redirección, créale el perfil.
            // O si ya existe, obtenlo y valida su rol.
            this.getUserProfile(firebaseUser.uid).pipe(
              switchMap(profile => {
                if (!profile) { // Si no existe el perfil, significa que es un usuario nuevo (ej. por Google Auth en redirección)
                  return this.createUserProfile(firebaseUser.uid, {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
                    photoURL: firebaseUser.photoURL,
                    role: 'pending', // O el rol por defecto que quieras asignar a nuevos usuarios
                    createdAt: new Date().toISOString(),
                    authProvider: firebaseUser.providerData[0]?.providerId || 'google' // Asegúrate de obtener el proveedor
                  }).pipe(
                    switchMap(() => this.logout()), // Desloguear si es 'pending'
                    switchMap(() => throwError(() => new Error('Su cuenta ha sido creada pero requiere aprobación por un administrador')))
                  );
                } else if (profile.role === 'inactive' || profile.role === 'pending') {
                  return this.logout().pipe(
                    switchMap(() => throwError(() => new Error(profile.role === 'inactive' ? 'Su cuenta ha sido desactivada. Contacte al administrador' : 'Su cuenta está pendiente de aprobación')))
                  );
                }
                // Si todo está bien, actualiza el último login y emite el perfil.
                this.updateLastLogin(firebaseUser.uid);
                this.userProfileSubject.next(profile);
                return of(profile); // Emitir el perfil para que el flujo continúe
              })
            ).subscribe({
              next: () => {
                this.authInitialized = true;
                observer.next();
                observer.complete();
              },
              error: err => {
                console.error('Error al obtener perfil durante inicialización:', err);
                this.authInitialized = true;
                observer.error(err);
              }
            });
          } else {
            this.userProfileSubject.next(null);
            this.authInitialized = true;
            observer.next();
            observer.complete();
          }
        });
      });
      
      return unsubscribe; // Devuelve la función de cancelación
    }).subscribe();
  }

  // Método para procesar el usuario después de redirección
  private processRedirectUser(user: any): Observable<void> {
    console.log('Procesando usuario de redirección:', user.email);

    // Validar dominio primero
    if (!this.isAllowedDomain(user.email)) {
      return this.logout().pipe(
        switchMap(() => throwError(() => new Error('Solo se permiten correos corporativos o dominios autorizados')))
      );
    }

    return this.getUserRole(user.uid).pipe(
      switchMap(role => {
        if (!role) {
          // Usuario nuevo, crear perfil
          return this.createUserProfile(user.uid, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || '',
            photoURL: user.photoURL,
            role: 'pending',
            createdAt: new Date().toISOString(),
            authProvider: 'google'
          }).pipe(
            switchMap(() => {
              // Después de crear el perfil pendiente, cerrar sesión
              return this.logout();
            }),
            tap(() => {
              this.zone.run(() => {
                this.router.navigate(['/auth/login'], {
                  queryParams: { message: 'pendingApproval' }
                });
              });
            })
          );
        } else if (role === 'inactive' || role === 'pending') {
          return this.logout().pipe(
            tap(() => {
              this.zone.run(() => {
                this.router.navigate(['/auth/login'], {
                  queryParams: {
                    message: role === 'inactive' ? 'accountInactive' : 'pendingApproval'
                  }
                });
              });
            })
          );
        } else {
          // Usuario válido, actualizamos último acceso
          this.updateLastLogin(user.uid);
          
          // Obtenemos el perfil completo y lo emitimos
          return this.getUserProfile(user.uid).pipe(
            tap(profile => {
              if (profile) {
                this.userProfileSubject.next(profile);
                
                // Redirigir al dashboard después de login exitoso
                this.zone.run(() => {
                  this.router.navigate(['/dashboard']);
                });
              }
            }),
            map(() => void 0)
          );
        }
      })
    );
  }

  // El resto de tus métodos (isMobileDevice, isAllowedDomain, etc.) permanecen igual
}