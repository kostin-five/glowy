import { Heart, Plus, Trash2 } from "lucide-react";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button, IconButton } from "./Button";

const meta = {
  title: "Primitives/Действия",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="flex flex-wrap gap-glowy-3">
      <Button>Добавить задачу</Button>
      <Button variant="secondary">Отложить</Button>
      <Button variant="ghost">Подробнее</Button>
      <IconButton aria-label="Добавить в избранное" variant="secondary">
        <Heart aria-hidden="true" className="size-5" />
      </IconButton>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="flex flex-wrap gap-glowy-3">
      <Button disabled>Добавить задачу</Button>
      <IconButton aria-label="Добавить задачу" disabled>
        <Plus aria-hidden="true" className="size-5" />
      </IconButton>
    </div>
  ),
};

export const Loading: Story = {
  render: () => <Button loading>Сохраняем</Button>,
};

export const Destructive: Story = {
  render: () => (
    <Button variant="destructive">
      <Trash2 aria-hidden="true" className="size-4" />
      Удалить черновик
    </Button>
  ),
};

export const KeyboardFocus: Story = {
  render: () => <Button autoFocus>Фокус с клавиатуры</Button>,
};
