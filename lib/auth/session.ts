import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getRequiredSession() {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session;
}
