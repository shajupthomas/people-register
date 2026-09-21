export interface Person {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  created_at: string;
}

export interface PersonInput {
  name: string;
  email: string;
  phone: string;
  role: string;
}
