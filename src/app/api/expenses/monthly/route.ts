import { NextResponse } from "next/server";

import { readLimitsFromEnv } from "@/lib/categories";
import { getMonthlyExpenseSummary } from "@/lib/notion";

export async function GET() {
  try {
    const summary = await getMonthlyExpenseSummary();

    return NextResponse.json({
      ...summary,
      limits: readLimitsFromEnv(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "월간 소비 조회에 실패했습니다.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
