import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureDefaultUser } from "@/lib/ensure-user";

export async function GET() {
  try {
    const user = await ensureDefaultUser();

    // Aggregate counts
    const [
      totalConversations,
      totalMessages,
      totalSearches,
      totalImages,
      totalAgents,
      activeAutomations,
      totalVoices,
      totalTranslations,
    ] = await Promise.all([
      db.conversation.count({ where: { userId: user.id } }),
      db.message.count({ where: { conversation: { userId: user.id } } }),
      db.searchHistory.count({ where: { userId: user.id } }),
      db.imageGeneration.count({ where: { userId: user.id } }),
      db.customAgent.count({ where: { userId: user.id } }),
      db.automation.count({ where: { userId: user.id, isActive: true } }),
      db.voiceGeneration.count({ where: { userId: user.id } }),
      db.translation.count({ where: { userId: user.id } }),
    ])

    // Today's usage
    const today = new Date().toISOString().split('T')[0]
    const todayStats = await db.usageStats.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    })

    // Weekly trend data (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    const weekStart = sevenDaysAgo.toISOString().split('T')[0]

    const weeklyStats = await db.usageStats.findMany({
      where: {
        userId: user.id,
        date: { gte: weekStart },
      },
      orderBy: { date: 'asc' },
    })

    const dailyTrend = weeklyStats.map((s) => ({
      date: s.date,
      chatRequests: s.chatRequests,
      searchRequests: s.searchRequests,
      imageRequests: s.imageRequests,
      agentRequests: s.agentRequests,
      automationRuns: s.automationRuns,
      voiceRequests: s.voiceRequests,
      visionRequests: s.visionRequests,
      translationRequests: s.translationRequests,
      tokensUsed: s.tokensUsed,
    }))

    // Credits remaining
    const updatedUser = await db.user.findUnique({ where: { id: user.id }, select: { credits: true } })

    return NextResponse.json({
      success: true,
      stats: {
        totalConversations,
        totalMessages,
        totalSearches,
        totalImages,
        totalAgents,
        activeAutomations,
        totalVoices,
        totalTranslations,
        creditsRemaining: updatedUser?.credits ?? 0,
        today: {
          chatRequests: todayStats?.chatRequests ?? 0,
          searchRequests: todayStats?.searchRequests ?? 0,
          imageRequests: todayStats?.imageRequests ?? 0,
          agentRequests: todayStats?.agentRequests ?? 0,
          automationRuns: todayStats?.automationRuns ?? 0,
          voiceRequests: todayStats?.voiceRequests ?? 0,
          visionRequests: todayStats?.visionRequests ?? 0,
          translationRequests: todayStats?.translationRequests ?? 0,
          tokensUsed: todayStats?.tokensUsed ?? 0,
        },
        weeklyTrend: dailyTrend,
      },
    })
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch stats" }, { status: 500 });
  }
}