import { Injectable, NgZone } from '@angular/core';
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
  getRedirectResult
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError, throwError, tap } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;
  private readonly ALLOWED_DOMAINS = ['gmail.com', 'empresa.com']; // Dominios permitidos

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private zone: NgZone
  ) {
    this.user$ = user(this.auth);
  }

  getCurrentUser(): Observable<UserProfile | null> {
    return this.user$.pipe(
      switchMap(user => {
        if (!user) return of(null);
        const userRef = doc(this.firestore, 'users', user.uid);
        return from(getDoc(userRef)).pipe(
          map(snapshot => {
            if (snapshot.exists()) {
              return { uid: user.uid, email: user.email, ...snapshot.data() } as UserProfile;
            } else {
              return { uid: user.uid, email: user.email, role: 'user' } as UserProfile;
            }
          })
        );
      })
    );
  }

  // Método para registrar usuarios desde el panel de admin (retorna UserCredential)
  registerUser(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  // Agregar método de registro para usuarios normales (no administradores)
  register(email: string, password: string, displayName?: string): Observable<void> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(credential => {
        const uid = credential.user.uid;
        return this.createUserProfile(uid, {
          email,
          displayName: displayName || email.split('@')[0],
          role: 'pending', // Los usuarios registrados quedan pendientes de aprobación
          createdAt: new Date().toISOString()
        });
      }),
      switchMap(() => {
        // Cerrar la sesión automáticamente después de registrar para que requiera aprobación
        return this.logout();
      }),
      map(() => {
        throw new Error('Su cuenta ha sido creada y está pendiente de aprobación por un administrador.');
      })
    );
  }

  login(email: string, password: string): Observable<UserCredential> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(credential => {
        return this.getUserRole(credential.user.uid).pipe(
          map(role => {
            if (!role || role === 'inactive') {
              // Usuario no autorizado o inactivo
              this.logout();
              throw new Error('Su cuenta no está activada. Contacte al administrador.');
            }
            return credential;
          })
        );
      })
    );
  }

  loginWithGoogle(): Observable<UserCredential> {
    return this.zone.runOutsideAngular(() => {
      const provider = new GoogleAuthProvider();
      
      // Mejor configuración para evitar problemas CORS
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Utiliza signInWithRedirect en navegadores móviles
      if (this.isMobileDevice()) {
        signInWithRedirect(this.auth, provider);
        return from(getRedirectResult(this.auth));
      } else {
        return from(signInWithPopup(this.auth, provider));
      }
    }).pipe(
      switchMap(result => {
        if (!result) {
          return throwError(() => new Error('No se pudo completar el inicio de sesión con Google'));
        }
        
        const user = result.user;
        
        // Verificar dominio permitido para mayor seguridad
        if (!this.isAllowedDomain(user.email)) {
          return this.logout().pipe(
            switchMap(() => throwError(() => new Error('Solo se permiten correos corporativos o dominios autorizados')))
          );
        }
        
        // Verificar si el usuario ya existe en la base de datos
        return this.getUserRole(user.uid).pipe(
          switchMap(role => {
            if (!role) {
              // Nuevo usuario: crear perfil con estado pendiente
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
        if (error.code === 'auth/popup-closed-by-user') {
          return throwError(() => new Error('Inicio de sesión cancelado por el usuario'));
        }
        return throwError(() => error);
      })
    );
  }

  logout() {
    return from(signOut(this.auth)).pipe(
      map(() => {
        this.router.navigate(['/auth/login']);
        return true;
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

  // Método que devuelve una Promise<void>, no un Observable
  createUserProfile(uid: string, data: any): Observable<void> {
    return this.zone.runOutsideAngular(() => {
      const userRef = doc(this.firestore, 'users', uid);
      return from(setDoc(userRef, {
        ...data,
        updatedAt: new Date().toISOString()
      }));
    });
  }

  // Método para verificar el rol del usuario
  getUserRole(uid: string): Observable<string | null> {
    return this.zone.runOutsideAngular(() => {
      const userRef = doc(this.firestore, 'users', uid);
      return from(getDoc(userRef)).pipe(
        map(snapshot => {
          if (snapshot.exists()) {
            return snapshot.data()['role'];
          }
          return null;
        }),
        catchError(() => of(null))
      );
    });
  }

  // Métodos auxiliares
  private isAllowedDomain(email: string | null): boolean {
    if (!email) return false;
    
    // Si no hay restricciones de dominio definidas, permitir cualquiera
    if (this.ALLOWED_DOMAINS.length === 0) return true;
    
    const domain = email.split('@')[1];
    return this.ALLOWED_DOMAINS.includes(domain);
  }
  
  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
  
  private updateLastLogin(uid: string): void {
    const userRef = doc(this.firestore, 'users', uid);
    updateDoc(userRef, {
      lastLogin: new Date().toISOString()
    }).catch(error => console.error('Error updating last login:', error));
  }
}
