import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/ensure-user";

export async function GET() {
  try {
    const user = await ensureDefaultUser();
    const activities = await db.activityLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ success: true, activities });
  } catch (error) {
    console.error("Activity fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch activities" }, { status: 500 });
  }
}