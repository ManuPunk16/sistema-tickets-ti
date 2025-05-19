import { Injectable } from '@angular/core';
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
import { Observable, from, map, of, switchMap } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
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

  async register(email: string, password: string, displayName?: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.createUserProfile(credential.user.uid, {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'user',
      createdAt: new Date().toISOString()
    });
  }

  // Método para registrar usuarios desde el panel de admin (retorna UserCredential)
  registerUser(email: string, password: string): Observable<UserCredential> {
    return from(createUserWithEmailAndPassword(this.auth, email, password));
  }

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  loginWithGoogle() {
    return from(signInWithPopup(this.auth, new GoogleAuthProvider())).pipe(
      switchMap(async (result) => {
        // Verificar si el perfil existe, de lo contrario crearlo
        const user = result.user;
        const userRef = doc(this.firestore, 'users', user.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
          await this.createUserProfile(user.uid, {
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || '',
            photoURL: user.photoURL,
            role: 'user',
            createdAt: new Date().toISOString()
          });
        }

        return result;
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

  private createUserProfile(uid: string, data: any) {
    const userRef = doc(this.firestore, 'users', uid);
    return setDoc(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
  }
}
