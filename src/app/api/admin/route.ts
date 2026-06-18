import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/ensure-user";
import { Prisma } from "@prisma/client";

/* ═══════════════════════════════════════════════════════════════════════
   GET — Admin Dashboard Data
   ═══════════════════════════════════════════════════════════════════════ */
export async function GET() {
  try {
    const user = await requireAdmin();

    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      onlineUsers,
      newUsersToday,
      totalConversations,
      totalMessages,
      totalSearches,
      totalImages,
      totalAgents,
      totalAutomations,
      recentUsers,
      dailyUsageTrend,
    ] = await Promise.all([
      // Total users
      db.user.count(),

      // Online users (lastSeen within 5 minutes)
      db.user.count({
        where: { lastSeen: { gte: fiveMinAgo } },
      }),

      // New users today
      db.user.count({
        where: { createdAt: { gte: todayStart } },
      }),

      // Platform-wide stats (all users)
      db.conversation.count(),
      db.message.count(),
      db.searchHistory.count(),
      db.imageGeneration.count(),
      db.customAgent.count(),
      db.automation.count(),

      // Recent 10 users
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
        },
      }),

      // Daily usage trend (last 30 days) — aggregate across all users
      db.usageStats.groupBy({
        by: ["date"],
        where: {
          date: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
          },
        },
        _sum: {
          chatRequests: true,
          searchRequests: true,
          imageRequests: true,
          agentRequests: true,
          automationRuns: true,
          voiceRequests: true,
          visionRequests: true,
          translationRequests: true,
          tokensUsed: true,
        },
        orderBy: { date: "asc" },
      }),
    ]);

    // Today's total requests (aggregate across all users)
    const todayStr = todayStart.toISOString().split("T")[0];
    const todayStats = await db.usageStats.aggregate({
      _sum: {
        chatRequests: true,
        searchRequests: true,
        imageRequests: true,
        agentRequests: true,
        automationRuns: true,
        voiceRequests: true,
        visionRequests: true,
        translationRequests: true,
      },
      where: { date: todayStr },
    });

    const todayRequests =
      (todayStats._sum.chatRequests ?? 0) +
      (todayStats._sum.searchRequests ?? 0) +
      (todayStats._sum.imageRequests ?? 0) +
      (todayStats._sum.agentRequests ?? 0) +
      (todayStats._sum.automationRuns ?? 0) +
      (todayStats._sum.voiceRequests ?? 0) +
      (todayStats._sum.visionRequests ?? 0) +
      (todayStats._sum.translationRequests ?? 0);

    return NextResponse.json({
      success: true,
      dashboard: {
        totalUsers,
        onlineUsers,
        newUsersToday,
        todayRequests,
        platformStats: {
          totalConversations,
          totalMessages,
          totalSearches,
          totalImages,
          totalAgents,
          totalAutomations,
        },
        recentUsers,
        dailyUsageTrend: dailyUsageTrend.map((d) => ({
          date: d.date,
          ...d._sum,
        })),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Admin GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   POST — Admin Actions
   ═══════════════════════════════════════════════════════════════════════ */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();
    const { action } = body;

    switch (action) {
      /* ─── List users with pagination ─── */
      case "users": {
        const page = Math.max(1, Number(body.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(body.limit) || 10));
        const search = (body.search as string)?.trim() || "";

        const where: Prisma.UserWhereInput = search
          ? {
              OR: [
                { email: { contains: search } },
                { name: { contains: search } },
              ],
            }
          : {};

        const [users, total] = await Promise.all([
          db.user.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              credits: true,
              language: true,
              isOnline: true,
              lastSeen: true,
              createdAt: true,
              _count: {
                select: {
                  conversations: true,
                  agents: true,
                  images: true,
                },
              },
            },
          }),
          db.user.count({ where }),
        ]);

        return NextResponse.json({
          success: true,
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        });
      }

      /* ─── Update user ─── */
      case "update-user": {
        const { userId, name, role, credits } = body as {
          userId: string;
          name?: string;
          role?: string;
          credits?: number;
        };

        if (!userId) {
          return NextResponse.json(
            { success: false, error: "userId is required" },
            { status: 400 }
          );
        }

        // Cannot change own role
        if (role && userId === admin.id) {
          return NextResponse.json(
            { success: false, error: "Vous ne pouvez pas modifier votre propre rôle" },
            { status: 403 }
          );
        }

        // Only admin/superadmin can change roles
        if (role && !["user", "admin", "superadmin"].includes(role)) {
          return NextResponse.json(
            { success: false, error: "Rôle invalide" },
            { status: 400 }
          );
        }

        // Superadmin can set any role, admin can only set user role
        if (role && admin.role !== "superadmin" && role === "superadmin") {
          return NextResponse.json(
            { success: false, error: "Seul un superadmin peut attribuer ce rôle" },
            { status: 403 }
          );
        }

        const updateData: Prisma.UserUpdateInput = {};
        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (credits !== undefined) updateData.credits = credits;

        const updated = await db.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            credits: true,
          },
        });

        return NextResponse.json({ success: true, user: updated });
      }

      /* ─── Delete user ─── */
      case "delete-user": {
        const { userId } = body as { userId: string };

        if (!userId) {
          return NextResponse.json(
            { success: false, error: "userId is required" },
            { status: 400 }
          );
        }

        if (userId === admin.id) {
          return NextResponse.json(
            { success: false, error: "Vous ne pouvez pas supprimer votre propre compte" },
            { status: 403 }
          );
        }

        // Cascade delete is handled by Prisma schema
        await db.user.delete({ where: { id: userId } });

        return NextResponse.json({ success: true, deleted: userId });
      }

      /* ─── Reset credits ─── */
      case "reset-credits": {
        const { userId, credits } = body as {
          userId: string;
          credits: number;
        };

        if (!userId || credits === undefined) {
          return NextResponse.json(
            { success: false, error: "userId and credits are required" },
            { status: 400 }
          );
        }

        const updated = await db.user.update({
          where: { id: userId },
          data: { credits: Number(credits) },
          select: { id: true, name: true, credits: true },
        });

        return NextResponse.json({ success: true, user: updated });
      }

      /* ─── Toggle online status ─── */
      case "toggle-online": {
        const { userId, isOnline } = body as {
          userId: string;
          isOnline: boolean;
        };

        if (!userId || isOnline === undefined) {
          return NextResponse.json(
            { success: false, error: "userId and isOnline are required" },
            { status: 400 }
          );
        }

        const updated = await db.user.update({
          where: { id: userId },
          data: { isOnline },
          select: { id: true, name: true, isOnline: true },
        });

        return NextResponse.json({ success: true, user: updated });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Action inconnue: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode }
      );
    }
    console.error("Admin POST error:", error);
    return NextResponse.json(
      { success: false, error: "Opération échouée" },
      { status: 500 }
    );
  }
}