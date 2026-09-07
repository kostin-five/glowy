// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button, IconButton } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
import { Alert, EmptyState, Skeleton } from "./Feedback";
import { Field, Input } from "./Form";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./Select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./Toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./Tooltip";

afterEach(cleanup);

describe("Glowy primitive controls", () => {
  it("disables actions while disabled or loading and preserves a touch target", () => {
    const onClick = vi.fn();
    const { rerender } = render(
      <Button onClick={onClick}>
        Сохранить
      </Button>
    );

    const button = screen.getByRole("button", { name: "Сохранить" });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(button).toHaveClass("min-h-glowy-touch-target");

    rerender(
      <Button disabled onClick={onClick}>
        Сохранить
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button loading onClick={onClick}>
        Сохранить
      </Button>
    );
    expect(screen.getByRole("button", { name: "Сохранить" })).toHaveAttribute(
      "aria-busy",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: "Сохранить" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("requires and exposes an accessible name for icon actions", () => {
    render(
      <IconButton aria-label="Закрыть">
        <span aria-hidden="true">×</span>
      </IconButton>
    );

    expect(screen.getByRole("button", { name: "Закрыть" })).toHaveClass(
      "size-glowy-touch-target"
    );
  });

  it("associates a field label, description, and error with its control", () => {
    render(
      <Field
        description="Короткое описание поможет сохранить мысль."
        error="Укажите название задачи."
        label="Название задачи"
      >
        <Input />
      </Field>
    );

    const input = screen.getByRole("textbox", { name: "Название задачи" });
    const description = screen.getByText("Короткое описание поможет сохранить мысль.");
    const error = screen.getByRole("alert");

    expect(input).toHaveAccessibleDescription(
      "Короткое описание поможет сохранить мысль. Укажите название задачи."
    );
    expect(input).toHaveAttribute("aria-errormessage", error.id);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", expect.stringContaining(description.id));
    expect(input).toHaveClass("min-h-glowy-touch-target");
  });

  it("keeps calm feedback states semantic and non-interactive", () => {
    render(
      <>
        <Skeleton data-testid="skeleton" />
        <EmptyState title="Пока пусто" description="Можно начать с малого." />
        <Alert tone="danger" title="Не удалось сохранить" />
      </>
    );

    expect(screen.getByTestId("skeleton")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("heading", { name: "Пока пусто" })).toBeVisible();
    expect(screen.getByRole("alert")).toHaveTextContent("Не удалось сохранить");
  });
});

function DialogExample() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Открыть диалог</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Пауза</DialogTitle>
        <DialogDescription>Можно закрыть клавишей Escape.</DialogDescription>
      </DialogContent>
    </Dialog>
  );
}

function SheetExample() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>Открыть панель</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle>Панель</SheetTitle>
        <SheetDescription>Она остаётся в пределах viewport.</SheetDescription>
      </SheetContent>
    </Sheet>
  );
}

function PopoverExample() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button>Открыть контекст</Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Контекст задачи">
        Небольшой контекст
      </PopoverContent>
    </Popover>
  );
}

function ToastExample() {
  const [open, setOpen] = useState(true);

  return (
    <ToastProvider>
      <Toast open={open} onOpenChange={setOpen} tone="success">
        <div>
          <ToastTitle>Сохранено</ToastTitle>
          <ToastDescription>Черновик доступен.</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

describe("Glowy primitive overlays and selection", () => {
  it("closes a controlled dialog with Escape and returns focus to its trigger", async () => {
    render(<DialogExample />);

    const trigger = screen.getByRole("button", { name: "Открыть диалог" });
    fireEvent.click(trigger);
    expect(screen.getByRole("dialog", { name: "Пауза" })).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Пауза" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes a mobile sheet with Escape and keeps safe-area sizing classes", async () => {
    render(<SheetExample />);

    const trigger = screen.getByRole("button", { name: "Открыть панель" });
    fireEvent.click(trigger);
    const sheet = screen.getByRole("dialog", { name: "Панель" });

    expect(sheet).toHaveClass("max-h-[min(85dvh,42rem)]");
    expect(sheet.className).toContain("safe-area-inset-bottom");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Панель" })).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("closes a controlled popover with Escape and restores trigger focus", async () => {
    render(<PopoverExample />);

    const trigger = screen.getByRole("button", { name: "Открыть контекст" });
    fireEvent.click(trigger);
    expect(screen.getByLabelText("Контекст задачи")).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByLabelText("Контекст задачи")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("selects options and tabs from the keyboard", async () => {
    const onValueChange = vi.fn();
    render(
      <>
        <Select onValueChange={onValueChange}>
          <SelectTrigger aria-label="Режим">
            <SelectValue placeholder="Выберите режим" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="calm">Спокойный</SelectItem>
            <SelectItem value="steady">Умеренный</SelectItem>
          </SelectContent>
        </Select>
        <Tabs defaultValue="today">
          <TabsList aria-label="Период">
            <TabsTrigger value="today">Сегодня</TabsTrigger>
            <TabsTrigger value="week">Неделя</TabsTrigger>
          </TabsList>
          <TabsContent value="today">Сейчас</TabsContent>
          <TabsContent value="week">Позже</TabsContent>
        </Tabs>
      </>
    );

    const select = screen.getByRole("combobox", { name: "Режим" });
    fireEvent.keyDown(select, { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("option", { name: "Спокойный" }), {
      key: "Enter",
    });
    expect(onValueChange).toHaveBeenCalledWith("calm");

    const today = screen.getByRole("tab", { name: "Сегодня" });
    fireEvent.focus(today);
    fireEvent.keyDown(today, { key: "ArrowRight" });
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "Неделя" })).toHaveAttribute(
        "data-state",
        "active"
      )
    );
  });

  it("renders and dismisses a scoped toast without a product store", async () => {
    render(<ToastExample />);

    expect(screen.getByText("Сохранено")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Закрыть уведомление" }));
    await waitFor(() => expect(screen.queryByText("Сохранено")).not.toBeInTheDocument());
  });

  it("shows tooltip content from keyboard focus", async () => {
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button>Подсказка</Button>
          </TooltipTrigger>
          <TooltipContent>Контекст для действия</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    fireEvent.focus(screen.getByRole("button", { name: "Подсказка" }));
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Контекст для действия")
    );
  });
});

describe("Glowy primitive source boundary", () => {
  it("does not introduce raw palette classes in the new namespace", () => {
    const sourceFiles = [
      "Button.tsx",
      "Dialog.tsx",
      "Feedback.tsx",
      "Form.tsx",
      "Popover.tsx",
      "Select.tsx",
      "Sheet.tsx",
      "Tabs.tsx",
      "Toast.tsx",
      "Tooltip.tsx",
    ];
    const rawPaletteClass = /(?:bg|border|text)-(?:slate|zinc|gray|indigo|rose|amber|emerald)-/;

    for (const sourceFile of sourceFiles) {
      const source = readFileSync(
        resolve("src/components/ui/primitives", sourceFile),
        "utf8"
      );
      expect(source).not.toMatch(rawPaletteClass);
    }
  });
});
