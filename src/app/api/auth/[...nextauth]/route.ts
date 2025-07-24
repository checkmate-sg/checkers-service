// src/app/api/auth/[...nextauth]/route.ts
export const runtime = "nodejs";

import { handlers } from "@/auth";

export const { GET, POST } = handlers;
