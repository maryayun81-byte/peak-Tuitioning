import { NextRequest, NextResponse } from "next/server"
import { generateLiveKitToken } from "@/lib/livekit"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get("sessionId")
    const role = searchParams.get("role") as 'teacher' | 'student'

    if (!sessionId || !role) {
      return NextResponse.json({ error: "Missing session parameters" }, { status: 400 })
    }

    const data = await generateLiveKitToken(sessionId, role)
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: error.message === "Unauthorized access" ? 401 : error.message === "Session not found" ? 404 : error.message === "You are not authorized for this session" ? 403 : 500 })
  }
}
