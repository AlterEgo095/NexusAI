import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, AuthError } from "@/lib/ensure-user";
import { Prisma } from "@prisma/client";
import { logSecurityEvent } from "@/lib/security-audit";
import {
  getAllSettings,
  getSettingsByCategory,
  updateSetting,
  bulkUpdateSettings,
  createSetting,
  deleteSetting,
} from "@/lib/system-settings";

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

        await logSecurityEvent('admin_action', admin.id, `Updated user ${updated.name}: role=${role || 'unchanged'}`, 'info');

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
        const userToDelete = await db.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
        if (userToDelete) {
          await logSecurityEvent('admin_action', admin.id, `Deleted user: ${userToDelete.name} (${userToDelete.email})`, 'warning');
        }
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

        await logSecurityEvent('admin_action', admin.id, `Reset credits for ${updated.name} to ${credits}`, 'info');

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

      /* ═══════════════════════════════════════════════════════════════
         Settings Actions
         ═══════════════════════════════════════════════════════════════ */

      /* ─── Get all settings ─── */
      case "get-settings": {
        const settings = await getAllSettings();
        return NextResponse.json({ success: true, settings });
      }

      /* ─── Get settings by category ─── */
      case "get-settings-category": {
        const { category } = body as { category: string };
        if (!category) {
          return NextResponse.json(
            { success: false, error: "category is required" },
            { status: 400 }
          );
        }
        const settings = await getSettingsByCategory(category);
        return NextResponse.json({ success: true, settings });
      }

      /* ─── Update a single setting ─── */
      case "update-setting": {
        const { key, value } = body as { key: string; value: string };
        if (!key || value === undefined) {
          return NextResponse.json(
            { success: false, error: "key and value are required" },
            { status: 400 }
          );
        }
        const setting = await updateSetting(key, String(value));
        return NextResponse.json({ success: true, setting });
      }

      /* ─── Bulk update settings ─── */
      case "bulk-update-settings": {
        const { updates } = body as { updates: Array<{ key: string; value: string }> };
        if (!updates || !Array.isArray(updates)) {
          return NextResponse.json(
            { success: false, error: "updates array is required" },
            { status: 400 }
          );
        }
        const settings = await bulkUpdateSettings(
          updates.map((u) => ({ key: u.key, value: String(u.value) }))
        );
        return NextResponse.json({ success: true, settings });
      }

      /* ─── Create a custom setting ─── */
      case "create-setting": {
        const { key, value, category, isSecret, label, description } = body as {
          key: string;
          value: string;
          category: string;
          isSecret: boolean;
          label: string;
          description?: string;
        };
        if (!key || !category || !label) {
          return NextResponse.json(
            { success: false, error: "key, category, and label are required" },
            { status: 400 }
          );
        }
        const setting = await createSetting({
          key,
          value: value || '',
          category,
          isSecret: isSecret || false,
          label,
          description,
        });
        return NextResponse.json({ success: true, setting });
      }

      /* ─── Delete a custom setting ─── */
      case "delete-setting": {
        const { key } = body as { key: string };
        if (!key) {
          return NextResponse.json(
            { success: false, error: "key is required" },
            { status: 400 }
          );
        }
        await deleteSetting(key);
        return NextResponse.json({ success: true, deleted: key });
      }

      /* ═══════════════════════════════════════════════════════════════
         Marketplace Agent Actions
         ═══════════════════════════════════════════════════════════════ */

      /* ─── List marketplace agents ─── */
      case "list-marketplace-agents": {
        const { category, search } = body as {
          category?: string;
          search?: string;
        };

        const where: Prisma.MarketplaceAgentWhereInput = {};
        if (category) where.category = category;
        if (search) {
          where.OR = [
            { name: { contains: search } },
            { description: { contains: search } },
            { agentId: { contains: search } },
          ];
        }

        const agents = await db.marketplaceAgent.findMany({
          where,
          orderBy: [{ isBuiltIn: 'desc' }, { createdAt: 'desc' }],
        });
        return NextResponse.json({ success: true, agents });
      }

      /* ─── Create a marketplace agent ─── */
      case "create-marketplace-agent": {
        const {
          agentId,
          name,
          description,
          longDescription,
          category,
          icon,
          color,
          systemPrompt,
          tools,
          capabilities,
          tags,
        } = body as {
          agentId: string;
          name: string;
          description: string;
          longDescription?: string;
          category: string;
          icon?: string;
          color?: string;
          systemPrompt: string;
          tools?: string;
          capabilities?: string;
          tags?: string;
        };

        if (!agentId || !name || !description || !category || !systemPrompt) {
          return NextResponse.json(
            { success: false, error: "agentId, name, description, category, and systemPrompt are required" },
            { status: 400 }
          );
        }

        const agent = await db.marketplaceAgent.create({
          data: {
            agentId,
            name,
            description,
            longDescription,
            category,
            icon: icon || '🤖',
            color: color || '#6366f1',
            systemPrompt,
            tools: tools || '[]',
            capabilities: capabilities || '[]',
            author: 'Admin',
            isBuiltIn: false,
            isPublished: true,
            tags: tags || '[]',
          },
        });
        return NextResponse.json({ success: true, agent });
      }

      /* ─── Update a marketplace agent ─── */
      case "update-marketplace-agent": {
        const { id, ...updates } = body as {
          id: string;
          [key: string]: any;
        };

        if (!id) {
          return NextResponse.json(
            { success: false, error: "id is required" },
            { status: 400 }
          );
        }

        // Build update data — only allow specific fields
        const allowedFields: (keyof Prisma.MarketplaceAgentUpdateInput)[] = [
          'name', 'description', 'longDescription', 'category',
          'icon', 'color', 'systemPrompt', 'tools', 'capabilities',
          'tags', 'isPublished',
        ];
        const updateData: Prisma.MarketplaceAgentUpdateInput = {};
        for (const field of allowedFields) {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        }

        const agent = await db.marketplaceAgent.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json({ success: true, agent });
      }

      /* ─── Delete a marketplace agent ─── */
      case "delete-marketplace-agent": {
        const { id, force } = body as { id: string; force?: boolean };

        if (!id) {
          return NextResponse.json(
            { success: false, error: "id is required" },
            { status: 400 }
          );
        }

        const existing = await db.marketplaceAgent.findUnique({ where: { id } });
        if (!existing) {
          return NextResponse.json(
            { success: false, error: "Agent not found" },
            { status: 404 }
          );
        }

        if (existing.isBuiltIn && !force) {
          return NextResponse.json(
            { success: false, error: "Cannot delete built-in agents. Use force: true to override." },
            { status: 403 }
          );
        }

        await db.marketplaceAgent.delete({ where: { id } });
        return NextResponse.json({ success: true, deleted: id });
      }

      /* ─── Toggle marketplace agent publication ─── */
      case "toggle-marketplace-agent": {
        const { id, isPublished } = body as {
          id: string;
          isPublished: boolean;
        };

        if (!id || isPublished === undefined) {
          return NextResponse.json(
            { success: false, error: "id and isPublished are required" },
            { status: 400 }
          );
        }

        const agent = await db.marketplaceAgent.update({
          where: { id },
          data: { isPublished },
        });
        return NextResponse.json({ success: true, agent });
      }

      /* ═══════════════════════════════════════════════════════════════
         User Detail & Activity Logs
         ═══════════════════════════════════════════════════════════════ */

      /* ─── User detail with full data ─── */
      case "user-detail": {
        const { userId } = body as { userId: string };
        if (!userId) return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });

        const user = await db.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, name: true, role: true, credits: true, language: true, isOnline: true, lastSeen: true, failedLoginAttempts: true, lockedUntil: true, createdAt: true, updatedAt: true }
        });
        if (!user) return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });

        const [conversations, agents, images, documents, activities, automations] = await Promise.all([
          db.conversation.count({ where: { userId } }),
          db.customAgent.count({ where: { userId } }),
          db.imageGeneration.count({ where: { userId } }),
          db.document.count({ where: { userId } }),
          db.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, type: true, action: true, details: true, createdAt: true } }),
          db.automation.count({ where: { userId } }),
        ]);

        const recentConversations = await db.conversation.findMany({
          where: { userId },
          orderBy: { updatedAt: 'desc' },
          take: 5,
          select: { id: true, title: true, model: true, createdAt: true, updatedAt: true, _count: { select: { messages: true } } }
        });

        return NextResponse.json({ success: true, user, stats: { conversations, agents, images, documents, automations }, recentActivity: activities, recentConversations });
      }

      /* ─── Activity logs ─── */
      case "activity-logs": {
        const { page = 1, limit = 50, type, userId: filterUserId } = body as { page?: number; limit?: number; type?: string; userId?: string };
        const p = Math.max(1, Number(page));
        const l = Math.min(100, Math.max(1, Number(limit)));

        const where: Prisma.ActivityLogWhereInput = {};
        if (type) where.type = type;
        if (filterUserId) where.userId = filterUserId;

        const [logs, total] = await Promise.all([
          db.activityLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (p - 1) * l,
            take: l,
            include: { user: { select: { id: true, name: true, email: true } } }
          }),
          db.activityLog.count({ where }),
        ]);

        return NextResponse.json({ success: true, logs, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total / l) } });
      }

      /* ═══════════════════════════════════════════════════════════════
         Announcement Actions
         ═══════════════════════════════════════════════════════════════ */

      /* ─── List announcements ─── */
      case "list-announcements": {
        const announcements = await db.platformAnnouncement.findMany({
          orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ success: true, announcements });
      }

      /* ─── Create announcement ─── */
      case "create-announcement": {
        const { title, message, type = 'info' } = body as { title: string; message: string; type?: string };
        if (!title || !message) return NextResponse.json({ success: false, error: "title and message are required" }, { status: 400 });

        // Deactivate all existing announcements
        await db.platformAnnouncement.updateMany({ where: { isActive: true }, data: { isActive: false } });

        const announcement = await db.platformAnnouncement.create({
          data: { title, message, type, isActive: true, createdBy: admin.id },
        });

        // Log admin action
        await logSecurityEvent('admin_action', admin.id, `Created announcement: ${title}`, 'info');

        return NextResponse.json({ success: true, announcement });
      }

      /* ─── Toggle announcement active state ─── */
      case "toggle-announcement": {
        const { id, isActive } = body as { id: string; isActive: boolean };
        if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });

        const announcement = await db.platformAnnouncement.update({
          where: { id },
          data: { isActive: isActive !== undefined ? isActive : false },
        });
        return NextResponse.json({ success: true, announcement });
      }

      /* ─── Delete announcement ─── */
      case "delete-announcement": {
        const { id } = body as { id: string };
        if (!id) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
        await db.platformAnnouncement.delete({ where: { id } });
        return NextResponse.json({ success: true, deleted: id });
      }

      /* ═══════════════════════════════════════════════════════════════
         System Info & User Lock Actions
         ═══════════════════════════════════════════════════════════════ */

      /* ─── System info ─── */
      case "system-info": {
        const fs = await import('fs');
        const path = await import('path');

        const dbPath = path.join(process.cwd(), 'db', 'custom.db');
        let dbSizeBytes = 0;
        try { dbSizeBytes = fs.statSync(dbPath).size; } catch {}

        const formatBytes = (b: number) => {
          if (b < 1024) return `${b} B`;
          if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
          return `${(b / 1048576).toFixed(2)} MB`;
        };

        const tableCounts: Record<string, number> = {};
        const tables = ['User', 'Conversation', 'Message', 'CustomAgent', 'ImageGeneration', 'Document', 'Automation', 'SearchHistory', 'ActivityLog', 'UsageStats', 'KnowledgeBase', 'Orchestration', 'Canvas', 'BrowserSession', 'McpConnection', 'Connector', 'VoiceGeneration', 'Translation', 'Memory', 'WebAuthnCredential', 'SecurityAuditLog', 'SystemSetting', 'PlatformAnnouncement', 'MarketplaceAgent', 'AgentExecution', 'WorkflowExecution', 'WebhookEndpoint', 'CronJob', 'DocumentVersion', 'KnowledgeChunk'];

        await Promise.all(tables.map(async (t) => {
          try {
            // @ts-ignore - dynamic model access
            tableCounts[t] = await (db as any)[t.charAt(0).toLowerCase() + t.slice(1)].count();
          } catch {}
        }));

        return NextResponse.json({
          success: true,
          system: {
            dbSize: formatBytes(dbSizeBytes),
            dbSizeBytes,
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            memoryUsage: formatBytes(process.memoryUsage().heapUsed),
            tables: tableCounts,
          }
        });
      }

      /* ─── Lock user ─── */
      case "lock-user": {
        const { userId } = body as { userId: string };
        if (!userId) return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
        const updated = await db.user.update({ where: { id: userId }, data: { lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }, select: { id: true, name: true, lockedUntil: true } });
        await logSecurityEvent('admin_action', admin.id, `Locked user account: ${updated.name}`, 'warning');
        return NextResponse.json({ success: true, user: updated });
      }

      /* ─── Unlock user ─── */
      case "unlock-user": {
        const { userId } = body as { userId: string };
        if (!userId) return NextResponse.json({ success: false, error: "userId is required" }, { status: 400 });
        const updated = await db.user.update({ where: { id: userId }, data: { lockedUntil: null, failedLoginAttempts: 0 }, select: { id: true, name: true, lockedUntil: true } });
        await logSecurityEvent('admin_action', admin.id, `Unlocked user account: ${updated.name}`, 'info');
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