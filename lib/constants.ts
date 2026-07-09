import type { UserRole } from "./types";

export const ROLE_HOME: Record<UserRole, string> = {
  kid: "/kids/home",
  parent: "/parent/dashboard",
  teacher: "/teacher/classroom",
};

export const AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
];

export const PUBLIC_PATHS = ["/", "/feedback"];

export const FEEDBACK_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScohl9ajuP_O7lWO2KwPw6x0rzIJFXaliLiRXZGTrTIDjy_0g/viewform?embedded=true";
