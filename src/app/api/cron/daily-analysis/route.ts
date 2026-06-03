import { runDailyAnalysis } from '@/app/actions/academic-profile'

export async function GET() {
  try {
    const result = await runDailyAnalysis()
    return Response.json({ success: true, ...result })
  } catch (err: any) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
