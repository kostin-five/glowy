import { z } from "zod";
import type { DemoData } from "./demoStorage";
import { demoTransaction } from "./demoStorage";
import type { Note, Task } from "../types";

const fields = z.object({ title: z.string().trim().max(200), content: z.string().max(50000), archived: z.boolean() })
  .refine((note) => note.title.length > 0 || note.content.trim().length > 0, "Напиши заголовок или текст заметки");
const findNote = (data: DemoData, id: number) => {
  const note = data.notes.find((item) => item.id === id);
  if (!note) throw new Error("Заметка не найдена");
  return note;
};
const reconcileLinks = (data: DemoData, tasks: Task[]) => {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  for (const note of data.notes) note.taskLinks = note.taskLinks.flatMap((link) => {
    const task = byId.get(link.task.id);
    return task ? [{ ...link, task: { id: task.id, title: task.title, completed: task.completed } }] : [];
  });
};

export const DemoNotes = {
  removeTaskLinks: (taskId: number) => demoTransaction((data) => {
    for (const note of data.notes) note.taskLinks = note.taskLinks.filter((link) => link.task.id !== taskId);
  }),
  list: (query: string, archived: boolean, tasks: Task[]) => demoTransaction((data) => {
    reconcileLinks(data, tasks);
    const search = query.trim().toLocaleLowerCase("ru-RU");
    return data.notes.filter((note) => note.archived === archived && `${note.title}\n${note.content}`.toLocaleLowerCase("ru-RU").includes(search))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id).slice(0, 500);
  }),
  get: (id: number, tasks: Task[]) => demoTransaction((data) => { reconcileLinks(data, tasks); return findNote(data, id); }),
  create: (input: { title: string; content: string }) => demoTransaction((data) => {
    const timestamp = new Date().toISOString();
    const note: Note = { ...fields.parse({ ...input, archived: false }), id: data.nextId++, createdAt: timestamp, updatedAt: timestamp, taskLinks: [] };
    data.notes.push(note);
    return note;
  }),
  update: (id: number, patch: Partial<Pick<Note, "title" | "content" | "archived">>) => demoTransaction((data) => {
    const note = findNote(data, id);
    Object.assign(note, fields.parse({ ...note, ...patch }), { updatedAt: new Date().toISOString() });
    return note;
  }),
  delete: (id: number) => demoTransaction((data) => { findNote(data, id); data.notes = data.notes.filter((note) => note.id !== id); }),
  link: (id: number, task: Task) => demoTransaction((data) => {
    const note = findNote(data, id);
    const existing = note.taskLinks.find((link) => link.task.id === task.id);
    if (existing) return existing;
    const link = { id: data.nextId++, task: { id: task.id, title: task.title, completed: task.completed } };
    note.taskLinks.push(link);
    return link;
  }),
  unlink: (id: number, taskId: number) => demoTransaction((data) => {
    const note = findNote(data, id);
    note.taskLinks = note.taskLinks.filter((link) => link.task.id !== taskId);
  }),
};
