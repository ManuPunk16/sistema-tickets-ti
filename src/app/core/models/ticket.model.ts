export type TicketStatus = 'nuevo' | 'asignado' | 'en_proceso' | 'en_espera' | 'resuelto' | 'cerrado';
export type TicketPriority = 'baja' | 'media' | 'alta' | 'critica';
export type TicketCategory = 'hardware' | 'software' | 'red' | 'accesos' | 'otro';

export interface TicketComment {
  id?: string;
  text: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  attachments?: string[]; // URLs de archivos adjuntos
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  department: string;
  createdBy: string;
  createdByName: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  estimatedTime?: number; // en minutos
  actualTime?: number; // en minutos
  comments?: TicketComment[];
  attachments?: string[]; // URLs de archivos adjuntos
  statusNote?: string;
}
