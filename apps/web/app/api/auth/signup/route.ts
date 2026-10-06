import { NextResponse } from "next/server";
import { api, ApiClientError } from "@/lib/api";
import { RegisterUserSchema } from "@soulsync/contracts";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = RegisterUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid input.", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await api.auth.register(parsed.data);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    if (err instanceof ApiClientError) {
      return NextResponse.json(
        { message: err.message, code: err.code },
        { status: err.statusCode || 400 }
      );
    }

    console.error("Signup error:", err);
    return NextResponse.json(
      { message: "Something went wrong." },
      { status: 500 }
    );
  }
}
