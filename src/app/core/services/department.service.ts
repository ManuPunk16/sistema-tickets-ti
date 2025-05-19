import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';

export interface Department {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class DepartmentService {
  private departmentsCollection;

  constructor(private firestore: Firestore) {
    this.departmentsCollection = collection(this.firestore, 'departments');
  }

  getDepartments(): Observable<string[]> {
    return collectionData(this.departmentsCollection, { idField: 'id' }).pipe(
      map((departments: any[]) => departments.map(dep => dep.name))
    );
  }

  getDepartmentDetails(): Observable<Department[]> {
    return collectionData(this.departmentsCollection, { idField: 'id' }) as Observable<Department[]>;
  }

  getDepartmentById(id: string): Observable<Department | null> {
    const departmentRef = doc(this.firestore, `departments/${id}`);
    return from(getDoc(departmentRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as Department;
        }
        return null;
      })
    );
  }

  createDepartment(data: Omit<Department, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    const now = new Date().toISOString();
    const newDepartment = {
      ...data,
      createdAt: now,
      updatedAt: now
    };

    return from(addDoc(this.departmentsCollection, newDepartment)).pipe(
      map(docRef => docRef.id)
    );
  }

  updateDepartment(id: string, data: Partial<Department>): Observable<void> {
    const departmentRef = doc(this.firestore, `departments/${id}`);
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    return from(updateDoc(departmentRef, updateData));
  }

  deleteDepartment(id: string): Observable<void> {
    const departmentRef = doc(this.firestore, `departments/${id}`);
    return from(deleteDoc(departmentRef));
  }
}
