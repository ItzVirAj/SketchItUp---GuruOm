import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { auditService } from '../audit/audit.service';
import { notificationsService } from '../notifications/notifications.service';
import { logger } from '../../utils/logger';
import {
  CreateAnnouncementSchema,
  UpdateAnnouncementSchema,
  CreateAnnouncementInput,
  UpdateAnnouncementInput
} from './announcements.schema';

export interface AnnouncementActor {
  id: string;
  email: string;
  name?: string;
}

export class AnnouncementsService {
  private db = getDbClient();

  async listAnnouncements(activeOnly = false) {
    let query = this.db
      .from('announcements')
      .select('*, author:posted_by ( id, full_name ), creator:created_by ( id, full_name )')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
    }

    const { data, error } = await query;
    let rows = data || [];
    if (error) {
      let fallbackQuery = this.db
        .from('announcements')
        .select('*, users:created_by ( id, full_name )')
        .order('created_at', { ascending: false });

      if (activeOnly) {
        fallbackQuery = fallbackQuery.or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`);
      }

      const fallback = await fallbackQuery;
      if (fallback.error) throw fallback.error;
      rows = fallback.data || [];
    }

    const mapped = rows.map(this.mapAnnouncement);
    // Sort pinned notices first, then recency
    return mapped.sort((a, b) => {
      const pinA = a.pinned ? 1 : 0;
      const pinB = b.pinned ? 1 : 0;
      if (pinA !== pinB) return pinB - pinA;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });
  }

  async createAnnouncement(input: CreateAnnouncementInput, actor: AnnouncementActor) {
    const validated = CreateAnnouncementSchema.parse(input);

    const now = new Date().toISOString();
    const payload: any = {
      title: validated.title,
      body: validated.body,
      posted_by: actor.id,
      created_by: actor.id,
      pinned: validated.pinned ?? false,
      published_at: validated.publishedAt || now,
      expires_at: validated.expiresAt || null
    };

    let inserted: any;
    const { data, error } = await this.db
      .from('announcements')
      .insert(payload)
      .select('*, author:posted_by ( id, full_name ), creator:created_by ( id, full_name )')
      .single();

    if (error) {
      // Resilient fallback for databases pending migration 048
      const isColumnErr =
        error.message?.includes('pinned') ||
        error.message?.includes('posted_by') ||
        error.message?.includes('published_at');

      if (isColumnErr) {
        const legacyPayload: any = {
          title: validated.title,
          body: validated.body,
          created_by: actor.id,
          expires_at: validated.expiresAt || null
        };
        const legacyRes = await this.db
          .from('announcements')
          .insert(legacyPayload)
          .select('*, users:created_by ( id, full_name )')
          .single();
        if (legacyRes.error) throw legacyRes.error;
        inserted = {
          ...legacyRes.data,
          pinned: validated.pinned ?? false,
          published_at: now
        };
      } else {
        throw error;
      }
    } else {
      inserted = data;
    }

    // Immediate one-way broadcast
    await notificationsService
      .triggerNotification({
        eventType: 'announcement_posted',
        entityType: 'announcement',
        entityId: inserted.id,
        title: validated.title,
        message: validated.body.length > 200 ? `${validated.body.slice(0, 200)}…` : validated.body,
        severity: 'INFO'
      } as any)
      .catch((err) => logger.warn('[Announcements] Failed to broadcast:', err));

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ANNOUNCEMENT_POSTED',
      entityType: 'announcements',
      entityId: inserted.id,
      metadata: { details: `Posted "${validated.title}".` }
    });

    return this.mapAnnouncement(inserted);
  }

  async updateAnnouncement(id: string, input: UpdateAnnouncementInput, actor: AnnouncementActor) {
    const validated = UpdateAnnouncementSchema.parse(input);
    const updatePayload: any = {};
    if (validated.title !== undefined) updatePayload.title = validated.title;
    if (validated.body !== undefined) updatePayload.body = validated.body;
    if (validated.pinned !== undefined) updatePayload.pinned = validated.pinned;
    if (validated.expiresAt !== undefined) updatePayload.expires_at = validated.expiresAt;
    updatePayload.updated_at = new Date().toISOString();

    let updated: any;
    const { data, error } = await this.db
      .from('announcements')
      .update(updatePayload)
      .eq('id', id)
      .select('*, author:posted_by ( id, full_name ), creator:created_by ( id, full_name )')
      .single();

    if (error) {
      const isColumnErr =
        error.message?.includes('pinned') ||
        error.message?.includes('posted_by') ||
        error.message?.includes('published_at');

      if (isColumnErr) {
        const legacyPayload: any = {};
        if (validated.title !== undefined) legacyPayload.title = validated.title;
        if (validated.body !== undefined) legacyPayload.body = validated.body;
        if (validated.expiresAt !== undefined) legacyPayload.expires_at = validated.expiresAt;

        const fallback = await this.db
          .from('announcements')
          .update(legacyPayload)
          .eq('id', id)
          .select('*')
          .single();
        if (fallback.error) throw fallback.error;
        updated = { ...fallback.data, pinned: validated.pinned };
      } else {
        throw error;
      }
    } else {
      updated = data;
    }

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ANNOUNCEMENT_UPDATED',
      entityType: 'announcements',
      entityId: id,
      metadata: { details: `Updated announcement ${id}.` }
    });

    return this.mapAnnouncement(updated);
  }

  async deleteAnnouncement(id: string, actor: AnnouncementActor) {
    const { error } = await this.db.from('announcements').delete().eq('id', id);
    if (error) throw error;

    await auditService.recordAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      action: 'ANNOUNCEMENT_DELETED',
      entityType: 'announcements',
      entityId: id,
      metadata: { details: `Removed announcement ${id}.` }
    });
    return { id, deleted: true };
  }

  private mapAnnouncement(row: any) {
    const authorName = row.author?.full_name || row.creator?.full_name || row.users?.full_name;
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      postedBy: row.posted_by || row.created_by,
      createdBy: row.created_by || row.posted_by,
      authorName: authorName || 'HR Team',
      pinned: Boolean(row.pinned),
      publishedAt: row.published_at || row.created_at,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at
    };
  }
}

export const announcementsService = new AnnouncementsService();
