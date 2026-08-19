import { z } from 'zod'
import { defineContract } from './_kit'
import { mockProjects } from '@/mocks/factories'

export const ProjectStatus = z.enum(['draft', 'active', 'archived'])
export type ProjectStatus = z.infer<typeof ProjectStatus>

export const Project = z.object({
  id: z.string(),
  name: z.string().min(1).max(80),
  description: z.string().max(500),
  status: ProjectStatus,
  volunteerCount: z.number().int(),
  createdAt: z.string(), // ISO string — never a Date, it must survive JSON
})
export type Project = z.infer<typeof Project>

export const list = defineContract({
  method: 'GET',
  path: '/api/projects',
  auth: 'user',
  summary: 'List projects visible to the current user',
  // GET inputs come from the query string, so every non-string needs z.coerce
  input: z.object({
    status: ProjectStatus.optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  output: z.object({ projects: z.array(Project), total: z.number().int() }),
  mock: ({ status, limit }) => {
    const projects = mockProjects.filter((p) => !status || p.status === status)
    return { projects: projects.slice(0, limit), total: projects.length }
  },
})

export const get = defineContract({
  method: 'GET',
  path: '/api/projects/:id', // :id is taken from the input object
  auth: 'user',
  summary: 'Fetch a single project by id',
  input: z.object({ id: z.string() }),
  output: z.object({ project: Project }),
  mock: ({ id }) => ({ project: { ...mockProjects[0], id } }),
})

export const create = defineContract({
  method: 'POST',
  path: '/api/projects',
  auth: 'user',
  summary: 'Create a project',
  input: z.object({
    name: z.string().min(1).max(80),
    description: z.string().max(500).default(''),
  }),
  output: z.object({ project: Project }),
  mock: ({ name, description }) => ({
    project: { ...mockProjects[0], id: 'new-project', name, description, status: 'draft' as const },
  }),
})

export const update = defineContract({
  method: 'PATCH',
  path: '/api/projects/:id',
  auth: 'user',
  summary: 'Update a project',
  input: z.object({
    id: z.string(),
    name: z.string().min(1).max(80).optional(),
    description: z.string().max(500).optional(),
    status: ProjectStatus.optional(),
  }),
  output: z.object({ project: Project }),
  mock: ({ id, name, description, status }) => {
    const base = mockProjects.find((p) => p.id === id) ?? mockProjects[0]
    return {
      project: {
        ...base,
        id,
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    }
  },
})

export const remove = defineContract({
  method: 'DELETE',
  path: '/api/projects/:id',
  auth: 'user',
  summary: 'Delete a project',
  input: z.object({ id: z.string() }),
  output: z.object({ id: z.string(), deleted: z.boolean() }),
  mock: ({ id }) => ({ id, deleted: true }),
})
