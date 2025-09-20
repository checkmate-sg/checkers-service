import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const PATCH = auth(function PATCH(req) {
    if (req.auth) return NextResponse.json(req.auth);

    return NextResponse.json({message: "Not authenticated"}, {status: 401});
})