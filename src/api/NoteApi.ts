import axios from "axios";
import { API_BASE_URL } from "./config";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { useAuthStore } from "../store/useAuthStore";
import { schemaNote, schemaNoteTaskLink, schemaTask, type Note, type TaskDraft } from "../types";

const api = axios.create({ baseURL: `${API_BASE_URL}/notes`, withCredentials: true });
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
attachUnauthorizedInterceptor(api);

export const NoteApi = {
  async list(query = "", archived = false): Promise<Note[]> {
    const response = await api.get("", { params: { query, archived } });
    return schemaNote.array().parse(response.data);
  },
  async create(data: { title: string; content: string }): Promise<Note> {
    return schemaNote.parse((await api.post("", data)).data);
  },
  async get(id: number): Promise<Note> {
    return schemaNote.parse((await api.get(`/${id}`)).data);
  },
  async update(id: number, data: Partial<Pick<Note, "title" | "content" | "archived">>): Promise<Note> {
    return schemaNote.parse((await api.put(`/${id}`, data)).data);
  },
  async linkTask(noteId: number, taskId: number) {
    return schemaNoteTaskLink.parse((await api.post(`/${noteId}/task-links`, { taskId })).data);
  },
  async unlinkTask(noteId: number, taskId: number) {
    await api.delete(`/${noteId}/task-links/${taskId}`);
  },
  async generateTaskDraft(noteId: number, fragment: string): Promise<TaskDraft> {
    const response = await api.post(`/${noteId}/task-draft`, { fragment });
    return response.data.draft as TaskDraft;
  },
  async confirmTask(noteId: number, draft: TaskDraft) {
    const response = await api.post(`/${noteId}/tasks`, draft);
    return schemaTask.parse(response.data.task);
  },
};
