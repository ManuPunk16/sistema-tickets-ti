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
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);
  user$: Observable<any>;
  currentAuthUser: any = null;

  private readonly ALLOWED_DOMAINS = ['gmail.com', 'consejeria.campeche.gob.mx', 'hotmail.com'];
  private authInitialized = false;
  private injector = inject(Injector);

  constructor(
    private auth: Auth,
    private router: Router,
    private zone: NgZone,
    private http: HttpClient
  ) {
    this.user$ = new Observable(observer => {
      return this.auth.onAuthStateChanged(
        u => observer.next(u),
        e => observer.error(e)
      );
    });
  }

  // ─── Utilidades internas ──────────────────────────────────────────────────

  private runSafely<T>(fn: () => Promise<T>): Observable<T> {
    return from(new Promise<T>((resolve, reject) => {
      runInInjectionContext(this.injector, async () => {
        try {
          resolve(await fn());
        } catch (error) {
          reject(error);
        }
      });
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

  // ─── Verificación con el API (fuente de verdad: MongoDB) ─────────────────

  /**
   * Llama al backend con el ID Token de Firebase.
   * El backend verifica el token, crea/obtiene el usuario en MongoDB
   * y regresa el perfil con el rol real.
   */
  verificarConAPI(): Observable<UserProfile> {
    return this.http
      .post<{ ok: boolean; usuario: UserProfile; esNuevo: boolean }>(
        `${environment.apiUrl}/auth/verificar`,
        {}
      )
      .pipe(
        map(resp => {
          this.userProfileSubject.next(resp.usuario);
          return resp.usuario;
        }),
        catchError(error => {
          // 403 = cuenta pending o inactive → el backend ya lo indica, cerrar sesión Firebase
          if (error.status === 403) {
            return from(signOut(this.auth)).pipe(
              switchMap(() => throwError(() => new Error(error.error?.error)))
            );
          }
          return throwError(() => error);
        })
      );
  }

  /** Refresca el perfil desde el API (útil en guardias o después de cambios de rol) */
  obtenerPerfilDesdeAPI(): Observable<UserProfile | null> {
    return this.http
      .get<{ ok: boolean; usuario: UserProfile }>(`${environment.apiUrl}/auth/perfil`)
      .pipe(
        map(resp => {
          this.userProfileSubject.next(resp.usuario);
          return resp.usuario;
        }),
        catchError(() => of(null))
      );
  }

  // ─── Estado del usuario ───────────────────────────────────────────────────

  getCurrentUser(): Observable<UserProfile | null> {
    return this.userProfileSubject.asObservable();
  }

  getCurrentUserSync(): UserProfile | null {
    return this.userProfileSubject.getValue();
  }

  isLoggedIn(): boolean {
    const firebaseUser = this.auth.currentUser || this.currentAuthUser;
    const appUser = this.userProfileSubject.getValue();

    if (!this.authInitialized) {
      return !!firebaseUser;
    }
    return !!firebaseUser && !!appUser;
  }

  isAuthInitialized(): boolean {
    return this.authInitialized;
  }

  // ─── Autenticación ────────────────────────────────────────────────────────

  /** Registro de cuenta nueva (queda en 'pending' hasta aprobación) */
  registerUser(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  /** Login con email y contraseña → verifica perfil en MongoDB */
  login(email: string, password: string): Observable<UserProfile> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(() => this.verificarConAPI())
    );
  }

  /** Login con Google (popup en desktop, redirect en móvil) */
  loginWithGoogle(): Observable<UserProfile | null> {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (this.isMobileDevice()) {
        try {
          sessionStorage.setItem('auth_redirect_pending', 'true');
          sessionStorage.setItem('auth_redirect_time', Date.now().toString());
        } catch (e) {
          console.warn('No se pudo guardar estado en sessionStorage:', e);
        }

        return this.runSafely(async () => {
          await this.auth.signOut().catch(() => {});
          await signInWithRedirect(this.auth, provider);
          return null; // nunca se ejecuta por la redirección
        });
      }

      // Desktop: popup
      return from(signInWithPopup(this.auth, provider)).pipe(
        switchMap(result => {
          if (!result) {
            return throwError(() => new Error('No se pudo completar el inicio de sesión con Google'));
          }
          if (!this.isAllowedDomain(result.user.email)) {
            return this.logout().pipe(
              switchMap(() => throwError(() => new Error('Solo se permiten correos corporativos o dominios autorizados')))
            );
          }
          return this.verificarConAPI();
        }),
        catchError(error => {
          if (error.code === 'auth/popup-closed-by-user') {
            return throwError(() => new Error('Inicio de sesión cancelado por el usuario'));
          }
          return throwError(() => error);
        })
      );
    } catch (error) {
      return throwError(() => error);
    }
  }

  logout(): Observable<void> {
    this.userProfileSubject.next(null);
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.zone.run(() => this.router.navigate(['/auth/login']));
      })
    );
  }

  resetPassword(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  // ─── Inicialización (al arrancar la app) ─────────────────────────────────

  /**
   * Verifica si hay una sesión activa (recarga de página o redirect de móvil).
   * Llamar una sola vez desde el APP_INITIALIZER.
   */
  initializeAuth(): Observable<void> {
    if (this.authInitialized) return of(void 0);

    return new Observable<void>(observer => {
      // Primero verificar si viene de un redirect de Google (móvil)
      this.checkRedirectResult().subscribe({
        next: redirectResult => {
          if (redirectResult?.user) {
            if (!this.isAllowedDomain(redirectResult.user.email)) {
              this.logout().subscribe(() =>
                this.setupAuthStateListener(observer)
              );
              return;
            }
            // Viene de redirect: verificar con API luego continuar listener normal
            this.verificarConAPI().subscribe({
              next: () => this.setupAuthStateListener(observer),
              error: () => this.setupAuthStateListener(observer) // 403 ya hizo logout
            });
          } else {
            this.setupAuthStateListener(observer);
          }
        },
        error: () => this.setupAuthStateListener(observer)
      });
    }).pipe(
      timeout(15000),
      catchError(err => {
        console.error('Timeout en inicialización de autenticación:', err);
        this.authInitialized = true;
        return of(void 0);
      })
    );
  }

  checkRedirectResult(): Observable<UserCredential | null> {
    return this.runSafely(async () => {
      try {
        return await getRedirectResult(this.auth);
      } catch (error) {
        console.error('Error en getRedirectResult:', error);
        return null;
      }
    });
  }

  /**
   * Listener de Firebase Auth para detectar sesión activa en recarga de página.
   * Solo se dispara una vez para completar la inicialización.
   */
  private setupAuthStateListener(observer: any): void {
    this.runSafely(async () => {
      const unsubscribe = this.auth.onAuthStateChanged(firebaseUser => {
        this.currentAuthUser = firebaseUser;

        this.zone.run(() => {
          if (firebaseUser) {
            // Sesión activa (recarga de página): restaurar perfil desde API
            this.verificarConAPI().subscribe({
              next: () => {
                this.authInitialized = true;
                observer.next();
                observer.complete();
              },
              error: () => {
                // 403: ya se hizo logout internamente, completar sin bloquear la app
                this.authInitialized = true;
                observer.next();
                observer.complete();
              }
            });
          } else {
            // Sin sesión activa
            this.userProfileSubject.next(null);
            this.authInitialized = true;
            observer.next();
            observer.complete();
          }
        });
      });

      return unsubscribe;
    }).subscribe();
  }

  registrarUsuarioPorAdmin(datos: {
    uid: string;
    email: string;
    displayName: string;
    role: 'admin' | 'support' | 'user';
    department?: string;
    position?: string;
  }): Observable<UserProfile> {
    return this.http
      .post<{ ok: boolean; usuario: UserProfile }>(
        `${environment.apiUrl}/auth/registrar`,
        datos
      )
      .pipe(map(resp => resp.usuario));
  }
}
