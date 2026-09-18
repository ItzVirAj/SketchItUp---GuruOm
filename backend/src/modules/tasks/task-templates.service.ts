import { z } from 'zod';
import { getDbClient } from '../../config/database';
import { tasksService, TaskActor } from './tasks.service';
import { CreateTemplateSchema } from './task-templates.schema';

export class TaskTemplatesService {
  private db = getDbClient();

  async listTemplates() {
    const { data: templates, error } = await this.db
      .from('task_templates')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    if (!templates?.length) return [];

    const { data: items } = await this.db
      .from('task_template_items')
      .select('*')
      .in('template_id', templates.map((t) => t.id))
      .order('sort_order', { ascending: true });

    const itemsByTemplate = new Map<string, any[]>();
    for (const item of items || []) {
      const list = itemsByTemplate.get(item.template_id) || [];
      list.push(item);
      itemsByTemplate.set(item.template_id, list);
    }

    return templates.map((t) => this.mapTemplate(t, itemsByTemplate.get(t.id) || []));
  }

  async createTemplate(input: z.infer<typeof CreateTemplateSchema>, actorId: string) {
    const validated = CreateTemplateSchema.parse(input);

    const { data: template, error } = await this.db
      .from('task_templates')
      .insert({ name: validated.name, description: validated.description, created_by: actorId })
      .select('*')
      .single();
    if (error) throw error;

    const { error: itemsErr } = await this.db.from('task_template_items').insert(
      validated.items.map((item, i) => ({
        template_id: template.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        due_days_offset: item.dueDaysOffset,
        sort_order: i
      }))
    );
    if (itemsErr) {
      await this.db.from('task_templates').delete().eq('id', template.id); // rollback, mirrors tasks.service.ts's pattern
      throw itemsErr;
    }

    return template.id;
  }

  /**
   * Applies a template: creates one real Task (via the existing
   * tasksService.createTask, so every assignee/reminder/audit-log code path
   * that already exists for Tasks runs unchanged) per template item, all
   * assigned to the same set of people.
   */
  async applyTemplate(templateId: string, assigneeUserIds: string[], appliedFromIso: string | undefined, actor: TaskActor) {
    const { data: template } = await this.db.from('task_templates').select('name').eq('id', templateId).maybeSingle();
    if (!template) throw new Error(`Task template ${templateId} not found.`);

    const { data: items, error } = await this.db
      .from('task_template_items')
      .select('*')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    if (!items?.length) throw new Error(`Template "${template.name}" has no items to apply.`);

    const baseMs = appliedFromIso ? new Date(appliedFromIso).getTime() : Date.now();
    const createdTaskIds: string[] = [];

    for (const item of items) {
      const dueDate = new Date(baseMs + item.due_days_offset * 24 * 60 * 60 * 1000).toISOString();
      const created = await tasksService.createTask(
        {
          title: item.title,
          description: item.description || undefined,
          priority: item.priority,
          dueDate,
          assigneeUserIds
        } as any,
        actor
      );
      if (created) createdTaskIds.push(created.id);
    }

    return { templateName: template.name, createdCount: createdTaskIds.length, taskIds: createdTaskIds };
  }

  private mapTemplate(row: any, items: any[]) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      items: items.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        priority: i.priority,
        dueDaysOffset: i.due_days_offset
      }))
    };
  }
}

export const taskTemplatesService = new TaskTemplatesService();
