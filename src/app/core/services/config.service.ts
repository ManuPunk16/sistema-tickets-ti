import { Injectable } from '@angular/core';
import { Firestore, doc, getDoc, setDoc } from '@angular/fire/firestore';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface SystemConfig {
  systemName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  emailNotificationsEnabled: boolean;
  newTicketNotification: boolean;
  statusChangeNotification: boolean;
  commentNotification: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  slaSettings: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  customCategories?: string[];
  customStatuses?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  constructor(private firestore: Firestore) {}

  getSystemConfig(): Observable<SystemConfig> {
    const configRef = doc(this.firestore, 'system/config');

    return from(getDoc(configRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return snapshot.data() as SystemConfig;
        }
        return this.getDefaultConfig();
      }),
      catchError(() => of(this.getDefaultConfig()))
    );
  }

  saveSystemConfig(config: Partial<SystemConfig>): Observable<void> {
    const configRef = doc(this.firestore, 'system/config');

    return this.getSystemConfig().pipe(
      map(currentConfig => ({
        ...currentConfig,
        ...config,
        updatedAt: new Date().toISOString()
      })),
      switchMap(mergedConfig => from(setDoc(configRef, mergedConfig)))
    );
  }

  private getDefaultConfig(): SystemConfig {
    return {
      systemName: 'Sistema de Tickets TI',
      supportEmail: 'soporte@empresa.com',
      maintenanceMode: false,
      emailNotificationsEnabled: true,
      newTicketNotification: true,
      statusChangeNotification: true,
      commentNotification: true,
      reminderEnabled: false,
      reminderDays: 7,
      slaSettings: {
        low: 48,
        medium: 24,
        high: 8,
        critical: 4
      }
    };
  }
}
