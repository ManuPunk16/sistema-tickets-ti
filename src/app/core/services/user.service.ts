import { Injectable } from '@angular/core';
import { Firestore, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where, deleteDoc, orderBy } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { Auth } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private firestore: Firestore,
    private auth: Auth
  ) { }

  getAllUsers(): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const usersQuery = query(usersCollection, orderBy('createdAt', 'desc'));
    return from(getDocs(usersQuery)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
      )
    );
  }

  getUserById(uid: string): Observable<UserProfile | null> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(getDoc(userRef)).pipe(
      map(doc => {
        if (doc.exists()) {
          return { uid: doc.id, ...doc.data() } as UserProfile;
        }
        return null;
      })
    );
  }

  getPendingUsers(): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const pendingQuery = query(usersCollection, where('role', '==', 'pending'));
    return from(getDocs(pendingQuery)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
      )
    );
  }

  approveUser(uid: string, role: string = 'user'): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(updateDoc(userRef, { 
      role,
      approvedAt: new Date().toISOString(),
      approvedBy: this.auth.currentUser?.uid || 'system',
      updatedAt: new Date().toISOString()
    }));
  }

  updateUserStatus(uid: string, isActive: boolean): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    const role = isActive ? 'user' : 'inactive';
    return from(updateDoc(userRef, { 
      role,
      updatedAt: new Date().toISOString(),
      updatedBy: this.auth.currentUser?.uid || 'system'
    }));
  }

  // MÉTODO FALTANTE 1: Obtener usuarios por rol
  getUsersByRole(role: string): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const roleQuery = query(usersCollection, where('role', '==', role));
    return from(getDocs(roleQuery)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile))
      )
    );
  }

  // MÉTODO FALTANTE 2: Actualizar usuario
  updateUser(uid: string, userData: Partial<UserProfile>): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(updateDoc(userRef, { 
      ...userData,
      updatedAt: new Date().toISOString(),
      updatedBy: this.auth.currentUser?.uid || 'system'
    }));
  }

  // MÉTODO FALTANTE 3: Crear perfil de usuario
  createUserProfile(uid: string, userData: Partial<UserProfile>): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(setDoc(userRef, {
      ...userData,
      updatedAt: new Date().toISOString()
    }));
  }

  // Método para obtener todos los departamentos (únicos) de los usuarios
  getUserDepartments(): Observable<string[]> {
    const usersCollection = collection(this.firestore, 'users');
    return from(getDocs(usersCollection)).pipe(
      map(snapshot => {
        const departments = new Set<string>();
        snapshot.docs.forEach(doc => {
          const department = doc.data()['department'];
          if (department) departments.add(department);
        });
        return Array.from(departments).sort();
      })
    );
  }

  // Método para eliminar un usuario (solo admin)
  deleteUser(uid: string): Observable<void> {
    const userRef = doc(this.firestore, 'users', uid);
    return from(deleteDoc(userRef));
  }
}

