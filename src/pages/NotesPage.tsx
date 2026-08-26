import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { NoteApi } from "../api/NoteApi";
import NoteEditor from "../components/notes/NoteEditor";
import NoteList from "../components/notes/NoteList";
import NoteTaskDraftDialog from "../components/notes/NoteTaskDraftDialog";
import { useTaskStore } from "../store/useTaskStore";
import type { Note, TaskDraft } from "../types";

type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";
const errorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError(error) && typeof error.response?.data?.error === "string"
    ? error.response.data.error
    : fallback;

export default function NotesPage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [draft, setDraft] = useState<TaskDraft | null>(null);
  const [draftBusy, setDraftBusy] = useState(false);
  const requestRevision = useRef(0);

  const loadNotes = useCallback(async () => {
    setLoading(true); setListError(null);
    try {
      const result = await NoteApi.list(query, archived);
      setNotes(result);
      if (noteId) {
        const requested = result.find((note) => note.id === Number(noteId)) ?? await NoteApi.get(Number(noteId));
        setSelected(requested); setTitle(requested.title); setContent(requested.content); setStatus("idle");
      } else {
        setSelected((current) =>
          current && !result.some((note) => note.id === current.id) ? null : current
        );
      }
    } catch (error) {
      setListError(errorMessage(error, "Не удалось загрузить заметки"));
    } finally { setLoading(false); }
  }, [archived, noteId, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadNotes(), 250);
    return () => window.clearTimeout(timer);
  }, [loadNotes]);

  const choose = (note: Note) => {
    setSelected(note); setTitle(note.title); setContent(note.content); setStatus("idle");
    navigate(`/notes/${note.id}`);
  };
  const createBlank = () => {
    setSelected(null); setTitle(""); setContent(""); setStatus("idle"); navigate("/notes");
  };
  const changeTitle = (value: string) => {
    requestRevision.current += 1;
    setTitle(value); setStatus("dirty");
  };
  const changeContent = (value: string) => {
    requestRevision.current += 1;
    setContent(value); setStatus("dirty");
  };

  const save = useCallback(async () => {
    if (!title.trim() && !content.trim()) return;
    const revision = ++requestRevision.current;
    const isCreating = selected === null;
    setStatus("saving");
    try {
      const saved = selected
        ? await NoteApi.update(selected.id, { title, content })
        : await NoteApi.create({ title, content });
      if (revision !== requestRevision.current) {
        if (isCreating) {
          setSelected(saved);
          setNotes((current) => [saved, ...current.filter((note) => note.id !== saved.id)]);
          navigate(`/notes/${saved.id}`, { replace: true });
          setStatus("dirty");
        }
        return;
      }
      setSelected(saved); setTitle(saved.title); setContent(saved.content); setStatus("saved");
      setNotes((current) => [saved, ...current.filter((note) => note.id !== saved.id)]);
      navigate(`/notes/${saved.id}`, { replace: true });
    } catch { if (revision === requestRevision.current) setStatus("error"); }
  }, [content, navigate, selected, title]);

  useEffect(() => {
    if (status !== "dirty") return;
    const timer = window.setTimeout(() => void save(), 1200);
    return () => window.clearTimeout(timer);
  }, [save, status]);

  const archiveNote = async () => {
    if (!selected) return;
    try {
      await NoteApi.update(selected.id, { archived: !selected.archived });
      createBlank(); await loadNotes();
    } catch (error) { setListError(errorMessage(error, "Не удалось изменить архив")); }
  };
  const refreshSelected = async () => {
    if (!selected) return;
    const note = await NoteApi.get(selected.id);
    setSelected(note); setNotes((all) => all.map((item) => item.id === note.id ? note : item));
  };
  const requestDraft = async (fragment: string) => {
    if (!selected) return;
    if (status === "dirty" || status === "saving" || status === "error") {
      setListError("Сначала сохраните изменения заметки"); return;
    }
    if (!fragment) { setListError("Сначала выделите фрагмент заметки"); return; }
    if (!navigator.onLine) { setListError("Для предложения задачи нужно подключение к интернету"); return; }
    setDraftBusy(true); setListError(null);
    try { setDraft(await NoteApi.generateTaskDraft(selected.id, fragment)); }
    catch (error) { setListError(errorMessage(error, "Glowy сейчас не смог подготовить черновик")); }
    finally { setDraftBusy(false); }
  };
  const confirmDraft = async () => {
    if (!selected || !draft || draftBusy) return;
    setDraftBusy(true);
    try {
      await NoteApi.confirmTask(selected.id, draft);
      await fetchTasks(); setDraft(null); await refreshSelected();
    } catch (error) { setListError(errorMessage(error, "Не удалось создать задачу")); }
    finally { setDraftBusy(false); }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <div><h1 className="font-display text-3xl font-bold">Умные заметки</h1><p className="mt-1 text-sm text-slate-500">Место для мыслей, к которым хочется вернуться.</p></div>
      {listError && <div role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{listError}</div>}
      <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-13rem)] lg:flex-row">
        <NoteList notes={notes} selectedId={selected?.id ?? null} query={query} archived={archived} loading={loading} error={null} onQueryChange={setQuery} onArchivedChange={(value) => { setArchived(value); createBlank(); }} onSelect={choose} onCreate={createBlank} />
        <NoteEditor note={selected} title={title} content={content} status={status} tasks={tasks} onTitle={changeTitle} onContent={changeContent} onSave={() => void save()} onArchive={() => void archiveNote()} onLink={(taskId) => selected && void NoteApi.linkTask(selected.id, taskId).then(refreshSelected).catch((error) => setListError(errorMessage(error, "Не удалось связать задачу")))} onUnlink={(taskId) => selected && void NoteApi.unlinkTask(selected.id, taskId).then(refreshSelected).catch((error) => setListError(errorMessage(error, "Не удалось убрать связь")))} onDraft={(fragment) => void requestDraft(fragment)} />
      </div>
      <NoteTaskDraftDialog draft={draft} busy={draftBusy} onChange={setDraft} onClose={() => setDraft(null)} onConfirm={() => void confirmDraft()} />
    </div>
  );
}
