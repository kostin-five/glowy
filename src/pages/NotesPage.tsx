import axios from "axios";
import { useCallback, useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
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
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const requestRevision = useRef(0);
  const loadRevision = useRef(0);
  const selectedIdRef = useRef<number | null>(null);
  const mobileEditorOpen = Boolean(noteId) || newNoteOpen;

  const loadNotes = useCallback(async () => {
    const revision = ++loadRevision.current;
    setLoading(true); setListError(null);
    try {
      const result = await NoteApi.list(query, archived);
      if (revision !== loadRevision.current) return;
      setNotes(result);
      if (noteId) {
        const requested = result.find((note) => note.id === Number(noteId)) ?? await NoteApi.get(Number(noteId));
        if (revision !== loadRevision.current) return;
        if (selectedIdRef.current !== requested.id) {
          selectedIdRef.current = requested.id;
          setSelected(requested); setTitle(requested.title); setContent(requested.content); setStatus("idle");
        }
      } else {
        setSelected((current) =>
          current && !result.some((note) => note.id === current.id) ? null : current
        );
      }
    } catch (error) {
      if (revision === loadRevision.current) setListError(errorMessage(error, "Не удалось загрузить заметки"));
    } finally { if (revision === loadRevision.current) setLoading(false); }
  }, [archived, noteId, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadNotes(), 250);
    return () => { window.clearTimeout(timer); loadRevision.current += 1; };
  }, [loadNotes]);

  const choose = (note: Note) => {
    selectedIdRef.current = note.id;
    setSelected(note); setTitle(note.title); setContent(note.content); setStatus("idle");
    setNewNoteOpen(false);
    navigate(`/notes/${note.id}`);
  };
  const resetEditor = () => {
    requestRevision.current += 1;
    selectedIdRef.current = null;
    setSelected(null); setTitle(""); setContent(""); setStatus("idle");
  };
  const createBlank = () => {
    resetEditor();
    navigate("/notes");
    setNewNoteOpen(true);
  };
  const changeTitle = (value: string) => {
    requestRevision.current += 1;
    setTitle(value); setStatus("dirty");
  };
  const changeContent = (value: string) => {
    requestRevision.current += 1;
    setContent(value); setStatus("dirty");
  };

  const save = useCallback(async (): Promise<boolean> => {
    if (!title.trim() && !content.trim()) {
      if (selected) setStatus("error");
      return selected === null;
    }
    const revision = ++requestRevision.current;
    const isCreating = selected === null;
    setStatus("saving");
    try {
      const saved = selected
        ? await NoteApi.update(selected.id, { title, content })
        : await NoteApi.create({ title, content });
      if (revision !== requestRevision.current) {
        if (isCreating) {
          selectedIdRef.current = saved.id;
          setSelected(saved);
          setNotes((current) => [saved, ...current.filter((note) => note.id !== saved.id)]);
          navigate(`/notes/${saved.id}`, { replace: true });
        }
        setStatus("dirty");
        return false;
      }
      selectedIdRef.current = saved.id;
      setSelected(saved); setTitle(saved.title); setContent(saved.content); setStatus("saved");
      setNotes((current) => [saved, ...current.filter((note) => note.id !== saved.id)]);
      navigate(`/notes/${saved.id}`, { replace: true });
      return true;
    } catch {
      if (revision === requestRevision.current) setStatus("error");
      return false;
    }
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
      setNotes((current) => current.filter((note) => note.id !== selected.id));
      resetEditor();
      setNewNoteOpen(false);
      navigate("/notes");
    } catch (error) { setListError(errorMessage(error, "Не удалось изменить архив")); }
  };
  const returnToList = async () => {
    if (status === "saving") return;
    if ((status === "dirty" || status === "error") && !(await save())) return;
    resetEditor();
    setNewNoteOpen(false);
    navigate("/notes");
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
    <div className="mx-auto flex w-full max-w-[96rem] flex-col gap-5">
      <header className={`${mobileEditorOpen ? "hidden lg:flex" : "flex"} flex-wrap items-end justify-between gap-3`}>
        <div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">Умные заметки</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Место для мыслей, к которым хочется вернуться.</p>
        </div>
        <span className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/50 bg-white/55 px-3 text-xs font-bold text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-950/35 dark:text-slate-300">
          <LockKeyhole size={15} className="text-indigo-400" /> Только для меня
        </span>
      </header>
      {listError && <div role="alert" className="rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{listError}</div>}
      <div className="flex min-h-0 flex-col gap-4 lg:h-[calc(100dvh-12.5rem)] lg:min-h-[38rem] lg:flex-row">
        <NoteList hiddenOnMobile={mobileEditorOpen} notes={notes} selectedId={selected?.id ?? null} query={query} archived={archived} loading={loading} error={null} onQueryChange={setQuery} onArchivedChange={(value) => { setArchived(value); resetEditor(); setNewNoteOpen(false); navigate("/notes"); }} onSelect={choose} onCreate={createBlank} />
        <NoteEditor hiddenOnMobile={!mobileEditorOpen} loading={Boolean(noteId) && selected?.id !== Number(noteId)} note={selected} title={title} content={content} status={status} tasks={tasks} onTitle={changeTitle} onContent={changeContent} onSave={() => void save()} onBack={() => void returnToList()} onArchive={() => void archiveNote()} onLink={(taskId) => selected && void NoteApi.linkTask(selected.id, taskId).then(refreshSelected).catch((error) => setListError(errorMessage(error, "Не удалось связать задачу")))} onUnlink={(taskId) => selected && void NoteApi.unlinkTask(selected.id, taskId).then(refreshSelected).catch((error) => setListError(errorMessage(error, "Не удалось убрать связь")))} onDraft={(fragment) => void requestDraft(fragment)} />
      </div>
      <NoteTaskDraftDialog draft={draft} busy={draftBusy} onChange={setDraft} onClose={() => setDraft(null)} onConfirm={() => void confirmDraft()} />
    </div>
  );
}
