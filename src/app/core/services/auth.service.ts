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
  user
} from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, catchError } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

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

  loginWithGoogle() {
    return this.zone.runOutsideAngular(() => {
      const provider = new GoogleAuthProvider();
      // Configuración completa para evitar problemas CORS
      provider.setCustomParameters({
        prompt: 'select_account',
        login_hint: 'user@example.com',
        // Opciones que mejoran compatibilidad con políticas de seguridad
        display: 'popup'
      });
      
      // Usar signInWithRedirect en lugar de popup si sigues teniendo problemas
      // return from(signInWithRedirect(this.auth, provider));
      return from(signInWithPopup(this.auth, provider));
    }).pipe(
      switchMap(result => {
        const user = result.user;
        
        // Verificar si el usuario ya existe en nuestra base de datos
        return this.getUserRole(user.uid).pipe(
          switchMap(role => {
            if (!role) {
              // Usuario nuevo desde Google - ponerlo como pendiente
              return this.createUserProfile(user.uid, {
                email: user.email,
                displayName: user.displayName || user.email?.split('@')[0] || '',
                photoURL: user.photoURL,
                role: 'pending', // Estado pendiente
                createdAt: new Date().toISOString()
              }).pipe(
                map(() => {
                  this.logout();
                  throw new Error('Su cuenta está pendiente de aprobación por un administrador.');
                })
              );
            } else if (role === 'inactive' || role === 'pending') {
              // Usuario existente pero no aprobado o inactivo
              this.logout();
              throw new Error('Su cuenta está pendiente de aprobación o ha sido desactivada.');
            }
            
            return of(result);
          })
        );
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
}
