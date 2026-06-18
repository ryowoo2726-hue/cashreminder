import { NextResponse } from "next/server";

import { deleteExpense } from "@/lib/notion";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await deleteExpense(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "소비 내역 삭제에 실패했습니다.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
