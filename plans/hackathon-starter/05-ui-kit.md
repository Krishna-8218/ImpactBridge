# 05 — UI kit & design direction

Tailwind v4 (`4.3.3`) + shadcn/ui. shadcn copies component source into the repo, so the
team can edit anything without fighting a library's API — the right trade for a weekend.

## Design direction — pick it once, on day zero

A hackathon UI reads as "templated default" when nobody makes a deliberate choice. Three
decisions, made once, in `globals.css`, and everything downstream inherits them:

1. **One accent colour, used sparingly.** NGO context → a warm, human palette rather than
   the default indigo-on-white every other team ships. Accent for primary actions only;
   never for decoration.
2. **A type scale with real contrast.** Big headings (`text-3xl`/`text-4xl`, tight
   tracking), small muted metadata (`text-sm text-muted-foreground`). Most hackathon UIs
   are uniformly `text-base` and look flat because of it.
3. **Generous, consistent spacing.** Settle on a `p-6` card / `gap-4` stack / `max-w-6xl`
   page rhythm and never deviate. Consistency reads as "designed" more than any single
   flourish.

Tailwind v4 keeps tokens in CSS, not `tailwind.config.js`:

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-background: oklch(0.99 0.005 95);
  --color-foreground: oklch(0.21 0.02 60);
  --color-primary:    oklch(0.58 0.14 45);   /* warm terracotta — one accent */
  --color-muted:      oklch(0.96 0.01 90);
  --color-muted-foreground: oklch(0.52 0.02 70);
  --color-border:     oklch(0.91 0.01 90);
  --radius: 0.75rem;
}
```

Dark mode: define the same tokens under `.dark` and ship a theme toggle. Judges demo in
whatever their laptop is set to — a broken dark mode is a visible bug.

> Anyone doing serious visual work should invoke the **`frontend-design`** skill before
> starting, and **`web-design-guidelines`** to review the result. Don't design by vibes at
> 3am.

## Components to install on day zero

One person runs this once, before anyone else clones — so nobody blocks on "can I add a
Dialog?":

```bash
npx shadcn@latest add button input textarea select label checkbox switch \
  card badge avatar separator skeleton \
  dialog sheet dropdown-menu popover tabs tooltip alert \
  form sonner table
```

That covers essentially every hackathon UI need. Adding more later is fine; the point is
that the first day isn't spent on it.

## App-level components (`src/components/app/`)

The pieces every team rebuilds badly under time pressure. Build them once:

| Component | Why it earns its place |
|---|---|
| `PageHeader` | title + description + right-aligned actions. Every page uses it → instant consistency. |
| `EmptyState` | icon + headline + action. Without it, empty lists look broken during the demo. |
| `LoadingState` / skeletons | `MOCK_DELAY_MS` guarantees these get exercised in dev. |
| `ErrorState` | with a retry callback. Pairs with `?__mock=error`. |
| `StatCard` | number + label + delta. Every dashboard needs three of them. |
| `DataTable` | thin wrapper over shadcn `table` with empty/loading built in. |
| `AppShell` | sidebar + topbar + user menu. Owned by one person; everyone else renders children. |
| `UserMenu` | avatar, name, sign-out. Reads `useSession()`. |
| `MockBadge` | **reads `source` off the API envelope and shows "MOCK" when data isn't live.** |

`MockBadge` is small and disproportionately valuable: it is what stops someone demoing
fake numbers to judges believing they're real. Render it wherever a page's primary data
comes from an endpoint.

## Forms

shadcn `form` = react-hook-form + a zod resolver. The payoff of the contract layer is that
**a form's schema is the endpoint's input schema** — one definition, client and server:

```tsx
import { zodResolver } from '@hookform/resolvers/zod'
import * as projects from '@/contracts/projects'
import { api } from '@/lib/api-client'

const form = useForm({ resolver: zodResolver(projects.create.input) })
const onSubmit = form.handleSubmit((values) => api.projects.create(values))
```

Client-side validation and server-side validation are now literally the same object and
cannot drift.

> **Verify at install time (U2):** that `@hookform/resolvers`' `zodResolver` supports
> **zod 4.4.3**. Zod v4 changed internals that resolver libraries hook into. Check this in
> Phase 0, before eight people write forms against it. Fallback: pin zod 3.x (and adjust
> `z.flattenError`/`z.toJSONSchema` usage in `02`, which are v4-only APIs), or use whatever
> resolver version shadcn's `form` pulls in.

## Server-error → form-error wiring

`defineRoute` returns `error.fields` as `Record<string, string[]>` on a `VALIDATION_ERROR`,
which maps straight onto react-hook-form:

```ts
catch (e) {
  if (e instanceof ApiClientError && e.fields)
    for (const [name, messages] of Object.entries(e.fields))
      form.setError(name as never, { message: messages[0] })
}
```

Write this once as a `useApiForm` hook in `src/components/forms/`. Otherwise eight people
write eight different (and mostly missing) versions of it.

## Motion

Restraint. `transition-colors` on interactive elements, a 150–200ms fade/slide on dialogs
and sheets (shadcn ships this), and nothing else unless someone has spare time. Honour
`prefers-reduced-motion`. Janky animation reads worse to judges than none.
