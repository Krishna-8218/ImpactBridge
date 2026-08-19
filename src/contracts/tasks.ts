import { z } from 'zod'
import { defineContract } from './_kit'
import { mockTasks } from '@/mocks/factories'

export const Task = z.object({
  id: z.string(),
  projectId: z.string(),
  title: z.string().min(1).max(140),
  done: z.boolean(),
  createdAt: z.string(), // ISO string — never a Date, it must survive JSON
})
export type Task = z.infer<typeof Task>

export const list = defineContract({
  method: 'GET',
  path: '/api/tasks',
  auth: 'user',
  summary: 'List tasks, optionally scoped to one project',
  // GET inputs are strings off the query string: coerce numbers, stringbool for booleans.
  input: z.object({
    projectId: z.string().optional(),
    done: z.stringbool().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
  }),
  output: z.object({ tasks: z.array(Task), total: z.number().int() }),
  mock: ({ projectId, done, limit }) => {
    const tasks = mockTasks.filter(
      (t) => (!projectId || t.projectId === projectId) && (done === undefined || t.done === done),
    )
    return { tasks: tasks.slice(0, limit), total: tasks.length }
  },
})

export const create = defineContract({
  method: 'POST',
  path: '/api/tasks',
  auth: 'user',
  summary: 'Create a task on a project',
  input: z.object({
    projectId: z.string(),
    title: z.string().min(1).max(140),
  }),
  output: z.object({ task: Task }),
  mock: ({ projectId, title }) => ({
    task: {
      ...mockTasks[0],
      id: 'new-task',
      projectId,
      title,
      done: false,
    },
  }),
})

export const toggle = defineContract({
  method: 'PATCH',
  path: '/api/tasks/:id',
  auth: 'user',
  summary: 'Toggle (or explicitly set) a task done flag',
  input: z.object({
    id: z.string(),
    done: z.boolean().optional(),
  }),
  output: z.object({ task: Task }),
  mock: ({ id, done }) => {
    const base = mockTasks.find((t) => t.id === id) ?? mockTasks[0]
    return { task: { ...base, id, done: done ?? !base.done } }
  },
})
