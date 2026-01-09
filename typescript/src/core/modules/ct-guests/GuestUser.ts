export interface GuestUser {
  username: string;
  password: string;
  valid: {
    from: number; // epoch time - ISO‑8601 datetime
    to: number;   // epoch time - ISO‑8601 datetime
  };
  assignedVlan?: number; // non‑negative integer
}
