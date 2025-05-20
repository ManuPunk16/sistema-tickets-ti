export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string | null;
  role: 'admin' | 'support' | 'user' | 'pending' | 'inactive';
  department?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string;
  authProvider?: string;
}
