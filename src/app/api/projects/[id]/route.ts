import { defineRoute } from '@/server/route'
import * as projects from '@/contracts/projects'

export const GET = defineRoute(projects.get)
export const PATCH = defineRoute(projects.update)
export const DELETE = defineRoute(projects.remove)
