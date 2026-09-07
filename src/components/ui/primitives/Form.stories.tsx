import type { Meta, StoryObj } from "@storybook/react-vite";

import { Field, Input, Label, Textarea } from "./Form";

const meta = {
  title: "Primitives/Поля ввода",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="grid max-w-md gap-glowy-6">
      <Field description="Так будет проще увидеть задачу в списке." label="Название задачи">
        <Input placeholder="Например, ответить на письмо" />
      </Field>
      <Field label="Заметка">
        <Textarea placeholder="Оставьте спокойный контекст для себя" />
      </Field>
      <div className="grid gap-glowy-2">
        <Label htmlFor="standalone-field">Отдельная метка</Label>
        <Input id="standalone-field" placeholder="Нативное поле" />
      </div>
    </div>
  ),
};

export const Error: Story = {
  render: () => (
    <div className="max-w-md">
      <Field
        description="Укажите короткое и понятное название."
        error="Название нужно, чтобы не потерять мысль."
        label="Название задачи"
      >
        <Input defaultValue=" " />
      </Field>
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="grid max-w-md gap-glowy-4">
      <Field label="Название задачи">
        <Input disabled value="Синхронизация скоро завершится" readOnly />
      </Field>
      <Field label="Заметка">
        <Textarea disabled value="Поле временно недоступно" readOnly />
      </Field>
    </div>
  ),
};

export const KeyboardFocus: Story = {
  render: () => (
    <div className="max-w-md">
      <Field label="Поле с видимым фокусом">
        <Input autoFocus placeholder="Начните писать" />
      </Field>
    </div>
  ),
};
