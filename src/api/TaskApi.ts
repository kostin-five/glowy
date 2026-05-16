import axios from "axios";
import type { Task } from "../types";

const url = "http://localhost:3000/api/tasks";

export const TaskApi = {
  async getTasks() {
    const response = await axios.get(url);
    return response.data;
  },

  async postTask(data: Task) {
    const response = await axios.post(url, data);
    return response.data;
  },

  async putTask(id: number, data: Task) {
    const response = await axios.put(`${url}/${id}`, data);
    return response.data;
  },

  async deleteTask(id: number) {
    const response = await axios.delete(`${url}/${id}`);
    return response.data;
  }
}
