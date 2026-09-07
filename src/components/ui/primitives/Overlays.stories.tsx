import { Bell, Info } from "lucide-react";
import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, IconButton } from "./Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "./Dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./Popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "./Sheet";
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

const meta = {
  title: "Primitives/Оверлеи",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const DialogKeyboard: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Открыть диалог</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Небольшая пауза</DialogTitle>
        <DialogDescription>
          Диалог закрывается клавишей Escape и возвращает фокус на эту кнопку.
        </DialogDescription>
      </DialogContent>
    </Dialog>
  ),
};

export const MobileSheet: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Открыть панель</Button>
      </SheetTrigger>
      <SheetContent side="bottom">
        <SheetTitle>План на вечер</SheetTitle>
        <SheetDescription>
          Нижняя панель сохраняет safe-area и остаётся в compact viewport.
        </SheetDescription>
      </SheetContent>
    </Sheet>
  ),
};

export const PopoverAndTooltip: Story = {
  render: () => (
    <div className="flex items-center gap-glowy-3">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary">Показать контекст</Button>
        </PopoverTrigger>
        <PopoverContent>
          <p className="text-sm text-glowy-text-secondary">
            Небольшой контекст остаётся рядом с действием и не блокирует экран.
          </p>
        </PopoverContent>
      </Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <IconButton aria-label="Подсказка" variant="ghost">
              <Info aria-hidden="true" className="size-5" />
            </IconButton>
          </TooltipTrigger>
          <TooltipContent>Подсказка появляется при фокусе или наведении.</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  ),
};

function ToastExample() {
  const [open, setOpen] = useState(false);

  return (
    <ToastProvider>
      <Button onClick={() => setOpen(true)}>
        <Bell aria-hidden="true" className="size-4" />
        Показать уведомление
      </Button>
      <Toast duration={60_000} open={open} onOpenChange={setOpen} tone="success">
        <div className="grid gap-glowy-1">
          <ToastTitle>Черновик сохранён</ToastTitle>
          <ToastDescription>Вы можете вернуться к нему в удобный момент.</ToastDescription>
        </div>
        <ToastClose />
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}

export const ScopedToast: Story = {
  render: () => <ToastExample />,
};
