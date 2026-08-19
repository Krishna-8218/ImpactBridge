import { defineRoute } from '@/server/route'
import * as tasks from '@/contracts/tasks'

export const GET = defineRoute(tasks.list)
export const POST = defineRoute(tasks.create)
