import { SessionOptions } from "iron-session";

export interface SessionData {
  isLoggedIn: boolean;
  username: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "rh-selector-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
  username: "",
};
