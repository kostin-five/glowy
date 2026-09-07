import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./Select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./Tabs";

const meta = {
  title: "Primitives/Выбор",
  parameters: {
    layout: "padded",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const SelectKeyboard: Story = {
  render: () => (
    <div className="max-w-sm">
      <Select defaultValue="calm">
        <SelectTrigger aria-label="Режим планирования">
          <SelectValue placeholder="Выберите режим" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Режим планирования</SelectLabel>
            <SelectItem value="calm">Спокойный</SelectItem>
            <SelectItem value="steady">Умеренный</SelectItem>
            <SelectItem value="strict">Собранный</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const TabsKeyboard: Story = {
  render: () => (
    <Tabs defaultValue="today">
      <TabsList aria-label="Период задач">
        <TabsTrigger value="today">Сегодня</TabsTrigger>
        <TabsTrigger value="week">Неделя</TabsTrigger>
        <TabsTrigger value="later">Позже</TabsTrigger>
      </TabsList>
      <TabsContent value="today">
        <p className="text-sm text-glowy-text-secondary">Один спокойный шаг уже выбран.</p>
      </TabsContent>
      <TabsContent value="week">
        <p className="text-sm text-glowy-text-secondary">Здесь появится план недели.</p>
      </TabsContent>
      <TabsContent value="later">
        <p className="text-sm text-glowy-text-secondary">Идеи можно оставить на потом.</p>
      </TabsContent>
    </Tabs>
  ),
};
