"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const AUTH_COOKIE = "curator_auth";

export async function loginAction(formData: FormData) {
  const password = formData.get("password") as string;
  const expected = process.env.CURATOR_PASSWORD;

  if (!expected) {
    redirect("/admin/login?error=misconfigured");
  }

  if (!password || password !== expected) {
    redirect("/admin/login?error=1");
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  redirect("/admin/signals");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE);
  redirect("/admin/login");
}
