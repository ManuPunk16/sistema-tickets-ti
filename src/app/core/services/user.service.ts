import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { UserProfile } from '../models/user.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/usuarios`;

  getAllUsers(rol?: string): Observable<UserProfile[]> {
    let params = new HttpParams();
    if (rol) params = params.set('rol', rol);

    return this.http
      .get<{ ok: boolean; usuarios: UserProfile[] }>(this.apiUrl, { params })
      .pipe(map(r => r.usuarios));
  }

  getUserById(uid: string): Observable<UserProfile | null> {
    return this.http
      .get<{ ok: boolean; usuario: UserProfile }>(`${this.apiUrl}/${uid}`)
      .pipe(map(r => r.usuario));
  }

  getPendingUsers(): Observable<UserProfile[]> {
    return this.getAllUsers('pending');
  }

  getUsersByRole(role: string): Observable<UserProfile[]> {
    return this.getAllUsers(role);
  }

  /** Crear usuario: el backend se encarga de Firebase Auth + MongoDB */
  createUser(datos: {
    email: string;
    displayName: string;
    password: string;
    role: 'admin' | 'support' | 'user';
    department?: string;
    position?: string;
  }): Observable<UserProfile> {
    return this.http
      .post<{ ok: boolean; usuario: UserProfile }>(this.apiUrl, datos)
      .pipe(map(r => r.usuario));
  }

  updateUser(uid: string, datos: Partial<UserProfile>): Observable<UserProfile> {
    return this.http
      .put<{ ok: boolean; usuario: UserProfile }>(`${this.apiUrl}/${uid}`, datos)
      .pipe(map(r => r.usuario));
  }

  activarUsuario(uid: string, role: 'admin' | 'support' | 'user' = 'user'): Observable<UserProfile> {
    return this.http
      .patch<{ ok: boolean; usuario: UserProfile }>(`${this.apiUrl}/${uid}/activar`, { role })
      .pipe(map(r => r.usuario));
  }

  desactivarUsuario(uid: string): Observable<UserProfile> {
    return this.http
      .patch<{ ok: boolean; usuario: UserProfile }>(`${this.apiUrl}/${uid}/desactivar`, {})
      .pipe(map(r => r.usuario));
  }

  deleteUser(uid: string): Observable<void> {
    return this.http
      .delete<{ ok: boolean }>(`${this.apiUrl}/${uid}`)
      .pipe(map(() => void 0));
  }

  /** Aprobación de usuario pendiente (atajo de activarUsuario) */
  approveUser(uid: string, role: 'admin' | 'support' | 'user' = 'user'): Observable<UserProfile> {
    return this.activarUsuario(uid, role);
  }

  /** Compatibilidad con componentes existentes */
  updateUserStatus(uid: string, isActive: boolean): Observable<UserProfile> {
    return isActive ? this.activarUsuario(uid) : this.desactivarUsuario(uid);
  }
}

