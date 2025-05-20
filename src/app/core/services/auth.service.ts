import { Injectable, NgZone } from '@angular/core';
import {
  Auth, // Inyectamos el servicio Auth de AngularFire
  GoogleAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  signInWithRedirect,
} from '@angular/fire/auth'; // Asegúrate de importar Auth desde aquí
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError, throwError, tap, BehaviorSubject, timeout } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';
import { isMobile } from '../utils/platform.utils';

// Importa los observables específicos de AngularFire
import { getRedirectResult as _getRedirectResult } from '@angular/fire/auth'; // Renombrado para evitar conflicto
import { authState } from 'rxfire/auth'; // Importar authState de rxfire/auth

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  user$: Observable<any>;
  currentAuthUser: any = null;
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'empresa.com']; // Dominios permitidos

  private authInitialized = false;

  constructor(
    private auth: Auth, // **Inyectado de AngularFire, no del SDK nativo**
    private firestore: Firestore,
    private router: Router,
    private zone: NgZone // Sigue siendo útil para ciertas operaciones de navegación o UI
  ) {
    // Aquí usamos authState de rxfire/auth que es zone-aware
    this.user$ = authState(this.auth);

    // No necesitas llamar a nada aquí, initializeAuth se encarga.
  }

  // Maneja el resultado de la redirección de Google
  // Este método privado ahora es interno, llamado por initializeAuth
  private handleRedirectResultInternal(): Observable<UserCredential | null> {
    // Usar la función de getRedirectResult de AngularFire
    return from(_getRedirectResult(this.auth)).pipe( // Usa el alias para getRedirectResult
      catchError(error => {
        console.error('Error al obtener resultado de redirección:', error);
        return of(null);
      })
    );
  }

  getCurrentUser(): Observable<UserProfile | null> {
    return this.userProfileSubject.asObservable();
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
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    if (this.isMobileDevice()) {
      console.log("Detectado dispositivo móvil, usando signInWithRedirect");
      // signInWithRedirect no retorna una promesa, inicia la redirección directamente.
      // El resultado se manejará en initializeAuth() al volver a la app.
      return from(signInWithRedirect(this.auth, provider)).pipe(
          map(() => null), // Ya que redirige, no hay resultado inmediato
          catchError(error => {
              console.error("Error en signInWithRedirect:", error);
              return throwError(() => error);
          })
      );
    } else {
      console.log("Detectado dispositivo de escritorio, usando signInWithPopup");
      return from(signInWithPopup(this.auth, provider)).pipe(
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
    return !!this.currentAuthUser;
  }

  initializeAuth(): Observable<void> {
  if (this.authInitialized) {
    return of(void 0);
  }

  return new Observable<void>(observer => {
    console.log('Iniciando autenticación...');

    // Listener de estado de autenticación (onAuthStateChanged)
    // Usamos authState de rxfire/auth, que ya es un Observable y zone-aware
    // Este observable detectará automáticamente si un usuario se autentica
    // ya sea por popup, email/pass o redirección.
    const authStateSubscription = authState(this.auth).subscribe(firebaseUser => {
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

    // IMPORTANTE: Asegúrate de desuscribirte si el servicio se destruye,
    // aunque para un servicio `providedIn: 'root'`, esto no es común.
    // Opcionalmente, puedes añadir:
    // return () => {
    //   authStateSubscription.unsubscribe();
    // };
  }).pipe(
    timeout(10000),
    catchError(err => {
      console.error('Timeout o error en inicialización de autenticación:', err);
      this.authInitialized = true;
      return of(void 0);
    })
  );
}

  // Método para procesar el usuario de redirección
  // private processRedirectUser(user: any) {
  //   this.getUserRole(user.uid).pipe(
  //     switchMap(role => {
  //       if (!role) {
  //         return this.createUserProfile(user.uid, {
  //           uid: user.uid,
  //           email: user.email,
  //           displayName: user.displayName || user.email?.split('@')[0] || '',
  //           photoURL: user.photoURL,
  //           role: 'pending',
  //           createdAt: new Date().toISOString(),
  //           authProvider: 'google'
  //         }).pipe(
  //           tap(() => {
  //             this.logout().subscribe(() => {
  //               this.zone.run(() => {
  //                 this.router.navigate(['/auth/login'], {
  //                   queryParams: { message: 'pendingApproval' }
  //                 });
  //               });
  //             });
  //           })
  //         );
  //       } else if (role === 'inactive' || role === 'pending') {
  //         return this.logout().pipe(
  //           tap(() => {
  //             this.zone.run(() => {
  //               this.router.navigate(['/auth/login'], {
  //                 queryParams: {
  //                   message: role === 'inactive' ? 'accountInactive' : 'pendingApproval'
  //                 }
  //               });
  //             });
  //           })
  //         );
  //       } else {
  //         this.updateLastLogin(user.uid);
  //         // Asegúrate de que la navegación si es necesaria esté dentro de zone.run
  //         this.zone.run(() => {
  //           this.router.navigate(['/dashboard']);
  //         });
  //         return of(null);
  //       }
  //     })
  //   ).subscribe();
  // }
}