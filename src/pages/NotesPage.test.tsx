// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteApi } from "../api/NoteApi";
import NoteTaskDraftDialog from "../components/notes/NoteTaskDraftDialog";
import type { Note, TaskDraft } from "../types";
import NotesPage from "./NotesPage";

vi.mock("../api/NoteApi", () => ({
  NoteApi: {
    list: vi.fn(),
    create: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    linkTask: vi.fn(),
    unlinkTask: vi.fn(),
    generateTaskDraft: vi.fn(),
    confirmTask: vi.fn(),
  },
}));

const note: Note = {
  id: 7,
  title: "План запуска",
  content: "Проверить мобильный сценарий",
  archived: false,
  createdAt: "2026-09-03T08:00:00.000Z",
  updatedAt: "2026-09-03T09:00:00.000Z",
  taskLinks: [],
};

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname}</output><button type="button" onClick={() => navigate(-1)}>Browser back</button></>;
}

const renderPage = (initialEntry = "/notes", history = [initialEntry]) => render(
  <MemoryRouter initialEntries={history} initialIndex={history.length - 1}>
    <Routes>
      <Route path="/notes/:noteId?" element={<NotesPage />} />
    </Routes>
    <LocationProbe />
  </MemoryRouter>
);

const expectMobileSurface = (surface: "list" | "editor") => {
  const list = screen.getByTestId("notes-list-surface");
  const editor = screen.getByTestId("notes-editor-surface");
  expect(list.className.split(" ")).toContain(surface === "list" ? "flex" : "hidden");
  expect(editor.className.split(" ")).toContain(surface === "editor" ? "flex" : "hidden");
  expect(list.className).toContain("lg:flex");
  expect(editor.className).toContain("lg:flex");
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(NoteApi.list).mockResolvedValue([note]);
  vi.mocked(NoteApi.get).mockResolvedValue(note);
  vi.mocked(NoteApi.update).mockImplementation(async (_id, data) => ({
    ...note,
    ...data,
    updatedAt: "2026-09-03T10:00:00.000Z",
  }));
  vi.mocked(NoteApi.create).mockImplementation(async (data) => ({
    ...note,
    ...data,
    id: 8,
  }));
});

describe("NotesPage mobile navigation", () => {
  it("disables the editor until a direct note route finishes loading", async () => {
    let finishList: (value: Note[]) => void = () => undefined;
    vi.mocked(NoteApi.list).mockReturnValueOnce(new Promise((resolve) => {
      finishList = resolve;
    }));
    renderPage("/notes/7");

    const title = screen.getByLabelText("Заголовок заметки");
    expect(title).toHaveProperty("disabled", true);
    expect(screen.getByTestId("notes-editor-surface").getAttribute("aria-busy")).toBe("true");

    await waitFor(() => expect(NoteApi.list).toHaveBeenCalledOnce());
    await act(async () => finishList([note]));
    await waitFor(() => expect(title).toHaveProperty("value", note.title));
    expect(title).toHaveProperty("disabled", false);
  });

  it("opens the list first, then replaces it with the selected editor", async () => {
    renderPage();

    expectMobileSurface("list");
    fireEvent.click(await screen.findByRole("button", { name: /План запуска/ }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/notes/7"));
    expectMobileSurface("editor");
    expect(screen.getByLabelText("Заголовок заметки")).toHaveProperty("value", "План запуска");
    expect(screen.getByRole("button", { name: "Назад к заметкам" })).toBeTruthy();
    expect(screen.getByRole("complementary", { name: "Контекст заметки" })).toBeTruthy();
  });

  it("does not overwrite fresh edits with a delayed route reload", async () => {
    let finishReload: (value: Note[]) => void = () => undefined;
    vi.mocked(NoteApi.list)
      .mockResolvedValueOnce([note])
      .mockReturnValueOnce(new Promise((resolve) => {
        finishReload = resolve;
      }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /План запуска/ }));
    const title = screen.getByLabelText("Заголовок заметки");
    fireEvent.change(title, { target: { value: "Свежий ввод" } });
    await waitFor(() => expect(NoteApi.list).toHaveBeenCalledTimes(2));

    await act(async () => finishReload([note]));

    expect(title).toHaveProperty("value", "Свежий ввод");
    expect(screen.getByText("Есть несохранённые изменения")).toBeTruthy();
  });

  it("opens an empty editor but returns without creating an empty note", async () => {
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Новая заметка" }));
    expectMobileSurface("editor");
    fireEvent.click(screen.getByRole("button", { name: "Назад к заметкам" }));

    await waitFor(() => expectMobileSurface("list"));
    expect(NoteApi.create).not.toHaveBeenCalled();
    expect(screen.getByTestId("location").textContent).toBe("/notes");
  });

  it("creates a non-empty new note before returning", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Новая заметка" }));
    fireEvent.change(screen.getByLabelText("Заголовок заметки"), {
      target: { value: "Новая идея" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Назад к заметкам" }));

    await waitFor(() => expect(NoteApi.create).toHaveBeenCalledWith({
      title: "Новая идея",
      content: "",
    }));
    await waitFor(() => expectMobileSurface("list"));
  });

  it("saves a changed note before returning to the list", async () => {
    renderPage("/notes/7");
    const title = await screen.findByLabelText("Заголовок заметки");
    await waitFor(() => expect(title).toHaveProperty("value", note.title));
    expectMobileSurface("editor");

    fireEvent.change(title, { target: { value: "Обновлённый план" } });
    fireEvent.click(screen.getByRole("button", { name: "Назад к заметкам" }));

    await waitFor(() => expect(NoteApi.update).toHaveBeenCalledWith(7, {
      title: "Обновлённый план",
      content: note.content,
    }));
    await waitFor(() => expectMobileSurface("list"));
    expect(screen.getByTestId("location").textContent).toBe("/notes");
  });

  it("keeps the editor and entered text visible when save fails", async () => {
    vi.mocked(NoteApi.update).mockRejectedValueOnce(new Error("offline"));
    renderPage("/notes/7");
    const title = await screen.findByLabelText("Заголовок заметки");
    await waitFor(() => expect(title).toHaveProperty("value", note.title));

    fireEvent.change(title, { target: { value: "Не потерять этот текст" } });
    fireEvent.click(screen.getByRole("button", { name: "Назад к заметкам" }));

    expect(await screen.findByText("Не удалось сохранить. Попробуйте ещё раз")).toBeTruthy();
    expectMobileSurface("editor");
    expect(title).toHaveProperty("value", "Не потерять этот текст");
    expect(screen.getByTestId("location").textContent).toBe("/notes/7");
  });

  it("keeps return disabled until an in-flight save finishes", async () => {
    let finishSave: (value: Note) => void = () => undefined;
    vi.mocked(NoteApi.update).mockReturnValueOnce(new Promise((resolve) => {
      finishSave = resolve;
    }));
    renderPage("/notes/7");
    const title = await screen.findByLabelText("Заголовок заметки");
    await waitFor(() => expect(title).toHaveProperty("value", note.title));
    fireEvent.change(title, { target: { value: "Дождаться сохранения" } });

    const back = screen.getByRole("button", { name: "Назад к заметкам" });
    fireEvent.click(back);
    await waitFor(() => expect(back).toHaveProperty("disabled", true));
    expectMobileSurface("editor");

    await act(async () => finishSave({ ...note, title: "Дождаться сохранения" }));
    await waitFor(() => expectMobileSurface("list"));
  });

  it("opens a direct note route and returns to the list through browser history", async () => {
    renderPage("/notes/7", ["/notes", "/notes/7"]);
    const title = await screen.findByLabelText("Заголовок заметки");
    await waitFor(() => expect(title).toHaveProperty("value", note.title));
    expectMobileSurface("editor");

    fireEvent.click(screen.getByRole("button", { name: "Browser back" }));

    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/notes"));
    expectMobileSurface("list");
  });

  it("returns to the current list after archiving a note", async () => {
    renderPage("/notes/7");
    await waitFor(() => expect(screen.getByLabelText("Заголовок заметки")).toHaveProperty("value", note.title));

    fireEvent.click(screen.getByRole("button", { name: "В архив" }));

    await waitFor(() => expect(NoteApi.update).toHaveBeenCalledWith(7, { archived: true }));
    await waitFor(() => expectMobileSurface("list"));
    expect(screen.getByTestId("location").textContent).toBe("/notes");
  });
});

const taskDraft: TaskDraft = {
  title: "Записаться к врачу",
  date: "",
  priority: "⚡️ P2",
  energyLevel: "med",
  category: "Здоровье",
  completed: false,
  subtasks: [],
};

describe("черновик задачи из заметки", () => {
  it("закрывается без подтверждения", () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<NoteTaskDraftDialog draft={taskDraft} busy={false} onChange={vi.fn()} onClose={onClose} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Отмена" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("блокирует повторное подтверждение во время создания", () => {
    const onConfirm = vi.fn();
    render(<NoteTaskDraftDialog draft={taskDraft} busy onChange={vi.fn()} onClose={vi.fn()} onConfirm={onConfirm} />);
    const button = screen.getByRole("button", { name: "Создаём…" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
