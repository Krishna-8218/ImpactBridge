import { defineRoute } from '@/server/route'
import * as tasks from '@/contracts/tasks'

export const PATCH = defineRoute(tasks.toggle)
