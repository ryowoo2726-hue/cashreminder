import { NextResponse } from "next/server";

import { createExpense, validateExpenseInput } from "@/lib/notion";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateExpenseInput(body);
    await createExpense(input);

    return NextResponse.json({
      expense: input,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "소비 내역 저장에 실패했습니다.";
    const status = message.includes("환경 변수") ? 500 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
