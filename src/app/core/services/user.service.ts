import { Injectable } from '@angular/core';
import { Firestore, collection, collectionData, doc, getDoc, setDoc, updateDoc, query, where } from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';
import { UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private firestore: Firestore) {}

  getUserById(id: string): Observable<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${id}`);
    return from(getDoc(userRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return { uid: snapshot.id, ...snapshot.data() } as UserProfile;
        } else {
          return null;
        }
      })
    );
  }

  getUsersByRole(role: string): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    const queryRef = query(usersCollection, where('role', '==', role));

    return collectionData(queryRef, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  getAllUsers(): Observable<UserProfile[]> {
    const usersCollection = collection(this.firestore, 'users');
    return collectionData(usersCollection, { idField: 'uid' }) as Observable<UserProfile[]>;
  }

  createUserProfile(uid: string, data: Partial<UserProfile>): Observable<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const userData = {
      ...data,
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return from(setDoc(userRef, userData));
  }

  updateUser(uid: string, data: Partial<UserProfile>): Observable<void> {
    const userRef = doc(this.firestore, `users/${uid}`);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    // Asegurar que no actualizamos campos que no deben ser actualizados
    delete updateData.uid;
    delete updateData.createdAt;

    return from(updateDoc(userRef, updateData));
  }
}

