import { Injectable, NgZone, inject } from '@angular/core';
import {
  Auth,
  GoogleAuthProvider,
  UserCredential,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  user,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError, throwError, tap, BehaviorSubject, timeout } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';
import { isMobile } from '../utils/platform.utils';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  user$: Observable<any>;
  currentAuthUser: any = null;
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'empresa.com']; // Dominios permitidos

  // Añade una variable para controlar el estado de inicialización
  private authInitialized = false;
  
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private zone: NgZone
  ) {
    // Observables para el usuario actual
    this.user$ = user(this.auth);
    
    // Manejar cambio de estado de autenticación
    onAuthStateChanged(this.auth, (firebaseUser) => {
      this.currentAuthUser = firebaseUser;
      if (firebaseUser) {
        this.getUserProfile(firebaseUser.uid).subscribe(profile => {
          this.userProfileSubject.next(profile);
        });
      } else {
        this.userProfileSubject.next(null);
      }
    });
    
    // Gestionar resultado de la redirección al inicio
    this.handleRedirectResult();
  }

  // Maneja el resultado de la redirección de Google
  private handleRedirectResult() {
    try {
      from(getRedirectResult(this.auth)).pipe(
        catchError(error => {
          console.error('Error al obtener resultado de redirección:', error);
          return of(null);
        })
      ).subscribe(result => {
        if (result && result.user) {
          // Usuario autenticado por redirección
          console.log('Usuario autenticado por redirección:', result.user.email);
          
          // Verificar el estado del usuario en Firestore
          this.getUserRole(result.user.uid).pipe(
            switchMap(role => {
              if (!role) {
                // Nuevo usuario: crear perfil con estado pendiente
                return this.createUserProfile(result.user.uid, {
                  uid: result.user.uid,
                  email: result.user.email,
                  displayName: result.user.displayName || result.user.email?.split('@')[0] || '',
                  photoURL: result.user.photoURL,
                  role: 'pending',
                  createdAt: new Date().toISOString(),
                  authProvider: 'google'
                }).pipe(
                  tap(() => {
                    // Cerrar sesión y mostrar mensaje
                    this.logout().subscribe(() => {
                      // Usar zone.run para asegurar que Angular detecte los cambios
                      this.zone.run(() => {
                        this.router.navigate(['/auth/login'], { 
                          queryParams: { message: 'pendingApproval' } 
                        });
                      });
                    });
                  })
                );
              } else if (role === 'inactive') {
                // Usuario inactivo
                return this.logout().pipe(
                  tap(() => {
                    this.zone.run(() => {
                      this.router.navigate(['/auth/login'], { 
                        queryParams: { message: 'accountInactive' } 
                      });
                    });
                  })
                );
              } else if (role === 'pending') {
                // Usuario pendiente
                return this.logout().pipe(
                  tap(() => {
                    this.zone.run(() => {
                      this.router.navigate(['/auth/login'], { 
                        queryParams: { message: 'pendingApproval' } 
                      });
                    });
                  })
                );
              } else {
                // Usuario válido - navegar al dashboard
                this.updateLastLogin(result.user.uid);
                this.zone.run(() => {
                  this.router.navigate(['/dashboard']);
                });
                return of(null);
              }
            })
          ).subscribe();
        }
      });
    } catch (error) {
      console.error('Error al manejar la redirección:', error);
    }
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

  // Método para registrar usuarios desde el panel de admin (retorna UserCredential)
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
            
            // Actualizar último acceso
            this.updateLastLogin(credential.user.uid);
            return of(credential);
          })
        );
      })
    );
  }

  // Método revisado para login con Google
  loginWithGoogle(): Observable<UserCredential | null> {
    // Usar zone.run para ejecutar dentro del contexto Angular
    return this.zone.run(() => {
      try {
        const provider = new GoogleAuthProvider();
        
        // Mejor configuración para evitar problemas CORS
        provider.setCustomParameters({
          prompt: 'select_account'
        });
        
        if (this.isMobileDevice()) {
          console.log("Detectado dispositivo móvil, usando signInWithRedirect");
          
          // Para móviles, usamos una promesa y luego la convertimos en observable
          // para evitar errores de zona
          try {
            signInWithRedirect(this.auth, provider);
            return of(null); // Retornar null ya que la redirección ocurrirá
          } catch (error) {
            console.error("Error en signInWithRedirect:", error);
            return throwError(() => error);
          }
        } else {
          // Para escritorio, usar popup (más fluido)
          console.log("Detectado dispositivo de escritorio, usando signInWithPopup");
          return from(signInWithPopup(this.auth, provider)).pipe(
            switchMap(result => {
              if (!result) {
                return throwError(() => new Error('No se pudo completar el inicio de sesión con Google'));
              }
              
              const user = result.user;
              
              // Verificar dominio permitido
              if (!this.isAllowedDomain(user.email)) {
                return this.logout().pipe(
                  switchMap(() => throwError(() => new Error('Solo se permiten correos corporativos o dominios autorizados')))
                );
              }
              
              // Verificar si el usuario existe y su rol
              return this.getUserRole(user.uid).pipe(
                switchMap(role => {
                  if (!role) {
                    // Nuevo usuario: crear perfil pendiente
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
                  
                  // Actualizar último acceso
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
    });
  }

  logout() {
    this.userProfileSubject.next(null);
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.router.navigate(['/auth/login']);
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

  // Método auxiliar para detectar dispositivos móviles
  private isMobileDevice(): boolean {
    return isMobile();
  }

  // Método auxiliar para verificar dominios permitidos
  private isAllowedDomain(email: string | null): boolean {
    if (!email) return false;
    
    // Si no hay restricciones de dominio definidas, permitir cualquiera
    if (this.ALLOWED_DOMAINS.length === 0) return true;
    
    const domain = email.split('@')[1];
    return this.ALLOWED_DOMAINS.includes(domain);
  }

  // Método para obtener el rol del usuario
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

  // Método para actualizar el último acceso
  private updateLastLogin(uid: string): void {
    const userRef = doc(this.firestore, 'users', uid);
    updateDoc(userRef, {
      lastLogin: new Date().toISOString()
    }).catch(error => console.error('Error updating last login:', error));
  }

  // Verificar si el usuario está autenticado
  isLoggedIn(): boolean {
    return !!this.currentAuthUser;
  }

  // Método para manejar la inicialización de autenticación
  initializeAuth(): Observable<void> {
    // Si ya inicializamos, retornar inmediatamente
    if (this.authInitialized) {
      return of(void 0);
    }
    
    return new Observable<void>(observer => {
      console.log('Iniciando autenticación...');
      
      // Primero intentamos recuperar cualquier resultado de redirección
      try {
        from(getRedirectResult(this.auth)).pipe(
          catchError(error => {
            console.error('Error al obtener resultado de redirección:', error);
            return of(null);
          })
        ).subscribe(result => {
          if (result && result.user) {
            console.log('Usuario autenticado por redirección:', result.user.email);
            // Procesar el resultado si existe
            this.processRedirectUser(result.user);
          }
        });
      } catch (error) {
        console.error('Error general al procesar redirección:', error);
      }
      
      // Luego configuramos el listener de estado de autenticación
      const unsubscribe = onAuthStateChanged(this.auth, (firebaseUser) => {
        console.log('Estado de autenticación detectado:', firebaseUser?.email || 'No autenticado');
        this.currentAuthUser = firebaseUser;
        
        if (firebaseUser) {
          // Usuario ya autenticado
          this.getUserProfile(firebaseUser.uid).subscribe({
            next: profile => {
              // Si el perfil existe pero está inactivo o pendiente, hacer logout
              if (profile && (profile.role === 'inactive' || profile.role === 'pending')) {
                this.logout().subscribe(() => {
                  this.zone.run(() => {
                    this.router.navigate(['/auth/login'], { 
                      queryParams: { 
                        message: profile.role === 'inactive' ? 'accountInactive' : 'pendingApproval' 
                      } 
                    });
                  });
                  
                  this.authInitialized = true;
                  observer.next();
                  observer.complete();
                });
                return;
              }
              
              // Usuario válido
              this.userProfileSubject.next(profile);
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
          // No hay usuario autenticado
          this.userProfileSubject.next(null);
          this.authInitialized = true;
          observer.next();
          observer.complete();
        }
        
        // No hacemos unsubscribe para mantener el listener activo
        // y detectar cambios en la sesión mientras la aplicación está abierta
        // unsubscribe();
      }, error => {
        console.error('Error durante la inicialización de Auth:', error);
        this.authInitialized = true;
        observer.error(error);
      });
    }).pipe(
      // Añadir un timeout para evitar esperas infinitas
      timeout(10000),
      catchError(err => {
        console.error('Timeout o error en inicialización de autenticación:', err);
        this.authInitialized = true;
        return of(void 0);
      })
    );
  }
  
  // Método para procesar el usuario de redirección
  private processRedirectUser(user: any) {
    // Verificar si el usuario existe y su rol
    this.getUserRole(user.uid).pipe(
      switchMap(role => {
        if (!role) {
          // Nuevo usuario: crear perfil pendiente
          return this.createUserProfile(user.uid, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || '',
            photoURL: user.photoURL,
            role: 'pending',
            createdAt: new Date().toISOString(),
            authProvider: 'google'
          }).pipe(
            tap(() => {
              this.logout().subscribe(() => {
                this.zone.run(() => {
                  this.router.navigate(['/auth/login'], { 
                    queryParams: { message: 'pendingApproval' } 
                  });
                });
              });
            })
          );
        } else if (role === 'inactive' || role === 'pending') {
          // Usuario inactivo o pendiente
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
          // Usuario válido - actualizar último acceso
          this.updateLastLogin(user.uid);
          return of(null);
        }
      })
    ).subscribe();
  }
}
