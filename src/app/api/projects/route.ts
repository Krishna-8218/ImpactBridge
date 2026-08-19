import { defineRoute } from '@/server/route'
import * as projects from '@/contracts/projects'

// No handler yet → these serve contract.mock. Add the second argument
// (`(input, { user }) => listProjects(user!.id, input)`) when the logic exists.
export const GET = defineRoute(projects.list)
export const POST = defineRoute(projects.create)
