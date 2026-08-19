// The registry. Append-only: a new feature is one import line and one key,
// so two people adding features on the same day touch two different lines.
import * as projects from './projects'
import * as tasks from './tasks'
import * as users from './users'

export const contracts = { projects, tasks, users }
export type Contracts = typeof contracts
