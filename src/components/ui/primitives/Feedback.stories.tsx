import { Plus } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";
import { Alert, Badge, Card, EmptyState, Skeleton } from "./Feedback";

const meta = {
  title: "Primitives/Состояния",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SurfaceAndBadges: Story = {
  render: () => (
    <div className="grid max-w-xl gap-glowy-6">
      <Card className="grid gap-glowy-3">
        <div className="flex flex-wrap items-center gap-glowy-2">
          <Badge>Спокойный ритм</Badge>
          <Badge tone="success">Готово</Badge>
          <Badge tone="warning">Нужно внимание</Badge>
          <Badge tone="danger">Просрочено</Badge>
        </div>
        <p className="text-sm text-glowy-text-secondary">
          Карточка использует только semantic roles, поэтому остаётся читаемой в обеих темах.
        </p>
      </Card>
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <Card className="grid max-w-md gap-glowy-3">
      <Skeleton className="h-5 w-2/5" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-glowy-touch-target w-32" />
    </Card>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="max-w-md">
      <EmptyState
        action={
          <Button>
            <Plus aria-hidden="true" className="size-4" />
            Записать задачу
          </Button>
        }
        description="Можно начать с одного понятного шага — этого достаточно."
        title="На сегодня задач пока нет"
      />
    </div>
  ),
};

export const Alerts: Story = {
  render: () => (
    <div className="grid max-w-xl gap-glowy-3">
      <Alert description="Сохраните изменения, когда будете готовы." title="Есть несохранённые правки" />
      <Alert tone="success" title="Задача сохранена" />
      <Alert tone="warning" title="Энергия на сегодня почти исчерпана" />
      <Alert tone="danger" title="Не удалось сохранить задачу" />
    </div>
  ),
};
