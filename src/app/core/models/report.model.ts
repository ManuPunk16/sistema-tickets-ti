export interface TicketMetric {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  avgResolutionTime: number; // en minutos
  ticketsByStatus: {[key: string]: number};
  ticketsByPriority: {[key: string]: number};
  ticketsByCategory: {[key: string]: number};
  ticketsByDepartment: {[key: string]: number};
  resolvedOnTime: number;
  resolvedLate: number;
}

export interface UserMetric {
  userId: string;
  displayName: string;
  ticketsCreated: number;
  ticketsResolved: number;
  avgResolutionTime: number; // en minutos
}

export interface DepartmentMetric {
  department: string;
  ticketsCount: number;
  resolvedCount: number;
  avgResolutionTime: number;
  ticketsByCategory?: {[key: string]: number};
  ticketsByPriority?: {[key: string]: number};
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface TimeSeriesData {
  created: TimeSeriesPoint[];
  resolved: TimeSeriesPoint[];
}
