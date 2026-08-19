'use client'

import { useEffect, useState } from 'react'

import { api } from '@/lib/api-client'

type Projects = Awaited<ReturnType<typeof api.projects.list>>['projects']

/**
 * Fetched on the client on purpose: `@/lib/api-client` calls relative URLs
 * (`/api/projects`), which only resolve in the browser. Server components should call
 * `src/server/*` directly instead of going back out through HTTP.
 */
export function ProjectsList() {
  const [projects, setProjects] = useState<Projects | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    api.projects
      .list({ limit: 10 })
      .then((data) => {
        if (!cancelled) setProjects(data.projects)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load projects')
      })

    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      >
        {error}
      </p>
    )
  }

  if (!projects) return <p className="text-sm text-gray-500">Loading projects…</p>
  if (projects.length === 0) return <p className="text-sm text-gray-500">No projects yet.</p>

  return (
    <ul className="flex flex-col gap-2">
      {projects.map((project) => (
        <li key={project.id} className="rounded-md border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium">{project.name}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {project.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">{project.description}</p>
        </li>
      ))}
    </ul>
  )
}
