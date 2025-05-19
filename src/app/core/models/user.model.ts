export interface UserProfile {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string | null;
  role: 'admin' | 'support' | 'user';
  department?: string;
  position?: string;
  createdAt?: string;
  updatedAt?: string;
}
