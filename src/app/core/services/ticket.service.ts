import { Injectable } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  deleteDoc,
  doc,
  getDoc,
  limit,
  orderBy,
  query,
  updateDoc,
  where,
  Timestamp,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from, map, switchMap } from 'rxjs';
import { Ticket, TicketComment, TicketStatus } from '../models/ticket.model';
import { AuthService } from './auth.service';
import { Storage, deleteObject, getDownloadURL, ref, uploadBytes } from '@angular/fire/storage';

@Injectable({
  providedIn: 'root'
})
export class TicketService {
  private ticketsCollection;

  constructor(
    private firestore: Firestore,
    private authService: AuthService,
    private storage: Storage
  ) {
    this.ticketsCollection = collection(this.firestore, 'tickets');
  }

  getAllTickets(statusFilter?: TicketStatus, departmentFilter?: string, limitCount = 100): Observable<Ticket[]> {
    let q = query(this.ticketsCollection, orderBy('createdAt', 'desc'));

    if (statusFilter) {
      q = query(q, where('status', '==', statusFilter));
    }

    if (departmentFilter) {
      q = query(q, where('department', '==', departmentFilter));
    }

    q = query(q, limit(limitCount));

    return collectionData(q, { idField: 'id' }) as Observable<Ticket[]>;
  }

  getUserTickets(userId: string): Observable<Ticket[]> {
    const q = query(
      this.ticketsCollection,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<Ticket[]>;
  }

  getAssignedTickets(supportId: string): Observable<Ticket[]> {
    const q = query(
      this.ticketsCollection,
      where('assignedTo', '==', supportId),
      orderBy('updatedAt', 'desc')
    );

    return collectionData(q, { idField: 'id' }) as Observable<Ticket[]>;
  }

  getTicketById(id: string): Observable<Ticket | null> {
    const ticketRef = doc(this.firestore, `tickets/${id}`);
    return from(getDoc(ticketRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return { id: snapshot.id, ...snapshot.data() } as Ticket;
        } else {
          return null;
        }
      })
    );
  }

  createTicket(ticket: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>): Observable<string> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');

        const newTicket = {
          ...ticket,
          createdBy: user.uid,
          createdByName: user.displayName || user.email,
          status: 'nuevo' as TicketStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return from(addDoc(this.ticketsCollection, newTicket));
      }),
      map(docRef => docRef.id)
    );
  }

  updateTicket(id: string, data: Partial<Ticket>): Observable<void> {
    const ticketRef = doc(this.firestore, `tickets/${id}`);
    const update = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    return from(updateDoc(ticketRef, update));
  }

  updateTicketStatus(id: string, status: TicketStatus, comment?: string): Observable<void> {
    const ticketRef = doc(this.firestore, `tickets/${id}`);
    const update: any = {
      status,
      updatedAt: new Date().toISOString()
    };

    // Actualizar fechas específicas según estado
    if (status === 'resuelto') {
      update.resolvedAt = new Date().toISOString();
    } else if (status === 'cerrado') {
      update.closedAt = new Date().toISOString();
    }

    if (comment) {
      update.statusNote = comment;
    }

    return from(updateDoc(ticketRef, update));
  }

  assignTicket(id: string, supportId: string, supportName: string): Observable<void> {
    const ticketRef = doc(this.firestore, `tickets/${id}`);
    return from(updateDoc(ticketRef, {
      assignedTo: supportId,
      assignedToName: supportName,
      status: 'asignado',
      updatedAt: new Date().toISOString()
    }));
  }

  addComment(id: string, comment: string, attachments: File[] = []): Observable<void> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user) throw new Error('Usuario no autenticado');

        return this.getTicketById(id).pipe(
          switchMap(async ticket => {
            if (!ticket) throw new Error('Ticket no encontrado');

            const ticketRef = doc(this.firestore, `tickets/${id}`);
            const comments = ticket.comments || [];
            const newComment: TicketComment = {
              text: comment,
              createdBy: user.uid,
              createdByName: user.displayName || user.email || 'Usuario',
              createdAt: new Date().toISOString(),
              attachments: []
            };

            // Subir archivos adjuntos si hay
            if (attachments && attachments.length > 0) {
              const attachmentUrls = await Promise.all(
                attachments.map(file => this.uploadAttachment(id, file))
              );
              newComment.attachments = attachmentUrls;
            }

            comments.push(newComment);

            await updateDoc(ticketRef, {
              comments,
              updatedAt: new Date().toISOString()
            });
          })
        );
      })
    );
  }

  async uploadAttachment(ticketId: string, file: File): Promise<string> {
    const timestamp = Date.now();
    const filePath = `tickets/${ticketId}/attachments/${timestamp}_${file.name}`;
    const fileRef = ref(this.storage, filePath);

    const uploadTask = await uploadBytes(fileRef, file);
    const downloadUrl = await getDownloadURL(uploadTask.ref);

    return downloadUrl;
  }

  deleteAttachment(url: string): Observable<void> {
    const fileRef = ref(this.storage, url);
    return from(deleteObject(fileRef));
  }
}
