import { env } from "../config/env.js";

export type User = {
  id: string;
  email: string;
  role: "user" | "organizer" | "admin";
  name?: string;
  isBanned?: boolean;
};

export type AppBindings = {
  Variables: {
    user: User;
    requestId: string;
  };
};
