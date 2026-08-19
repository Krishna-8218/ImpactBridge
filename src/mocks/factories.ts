/**
 * Mock fixtures — the single source of "what the data looks like" for BOTH the contract
 * mocks and the database seed (`src/db/seed.ts`). Ids here are the ids that get seeded,
 * so a URL that works against mock data still works against the real database.
 *
 * WHY LITERALS AND NOT FAKER:
 * `src/contracts/*.ts` import this file, `src/lib/api-client.ts` imports the contracts,
 * and client components import the api-client. So anything imported here is shipped to
 * the BROWSER. `@faker-js/faker` is hundreds of KB of fixture-generation code that would
 * be bundled into every page for zero runtime benefit. Literals are also deterministic by
 * construction — no seeding ritual, identical on all 8 machines, and diffable in review.
 *
 * Adding data: just append. Keep ids stable (`project-13`, …) — the seed upserts on them,
 * so changing an id orphans the previously seeded row instead of updating it.
 */
import type { Project } from '@/contracts/projects'
import type { Task } from '@/contracts/tasks'
import type { User } from '@/contracts/users'

export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Aditi Raman',
    email: 'aditi.raman@example.org',
    image: null,
    ngoRole: 'coordinator',
    organization: 'Sankalp Foundation',
    phone: '+91 98200 11223',
    city: 'Mumbai',
    systemRole: 'admin',
    onboardingComplete: true,
    createdAt: '2026-01-14T09:12:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Daniel Okafor',
    email: 'daniel.okafor@example.org',
    image: null,
    ngoRole: 'volunteer',
    organization: 'Sankalp Foundation',
    phone: '+234 802 445 1190',
    city: 'Lagos',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-02-03T14:40:00.000Z',
  },
  {
    id: 'user-3',
    name: 'Meera Krishnan',
    email: 'meera.krishnan@example.org',
    image: null,
    ngoRole: 'beneficiary',
    organization: '',
    phone: '+91 90040 55321',
    city: 'Chennai',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-02-19T07:05:00.000Z',
  },
  {
    id: 'user-4',
    name: 'Tomas Ferreira',
    email: 'tomas.ferreira@example.org',
    image: null,
    ngoRole: 'donor',
    organization: 'Ferreira & Co.',
    phone: '+351 912 300 447',
    city: 'Lisbon',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-03-08T18:22:00.000Z',
  },
  {
    id: 'user-5',
    name: 'Sana Qureshi',
    email: 'sana.qureshi@example.org',
    image: null,
    ngoRole: 'volunteer',
    organization: 'Roshni Collective',
    phone: '+92 300 7781234',
    city: 'Karachi',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-03-27T11:58:00.000Z',
  },
  {
    id: 'user-6',
    name: 'Grace Mwangi',
    email: 'grace.mwangi@example.org',
    image: null,
    ngoRole: 'coordinator',
    organization: 'Uzima Trust',
    phone: '+254 722 118 990',
    city: 'Nairobi',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-04-11T06:30:00.000Z',
  },
  {
    id: 'user-7',
    name: 'Lucas Moreau',
    email: 'lucas.moreau@example.org',
    image: null,
    ngoRole: 'volunteer',
    organization: '',
    phone: '+33 6 12 55 78 90',
    city: 'Marseille',
    systemRole: 'user',
    onboardingComplete: false,
    createdAt: '2026-05-02T16:14:00.000Z',
  },
  {
    id: 'user-8',
    name: 'Priya Nair',
    email: 'priya.nair@example.org',
    image: null,
    ngoRole: 'donor',
    organization: 'Nair Family Trust',
    phone: '+91 98450 22114',
    city: 'Bengaluru',
    systemRole: 'user',
    onboardingComplete: true,
    createdAt: '2026-05-21T13:47:00.000Z',
  },
]

export const mockProjects: Project[] = [
  {
    id: 'project-1',
    name: 'Monsoon Flood Relief — Kerala',
    description:
      'Pre-positioning dry rations and water purification tablets across 14 shelters ahead of the monsoon peak.',
    status: 'active',
    volunteerCount: 34,
    createdAt: '2026-01-18T08:00:00.000Z',
  },
  {
    id: 'project-2',
    name: 'After-School STEM Lab',
    description:
      'Weekend robotics and coding sessions for 120 students across three municipal schools.',
    status: 'active',
    volunteerCount: 18,
    createdAt: '2026-01-29T10:30:00.000Z',
  },
  {
    id: 'project-3',
    name: 'Mobile Health Camp — Rural Outreach',
    description:
      'Monthly diagnostic camps covering eleven villages, focused on maternal and child health.',
    status: 'active',
    volunteerCount: 27,
    createdAt: '2026-02-07T09:15:00.000Z',
  },
  {
    id: 'project-4',
    name: 'Community Kitchen Expansion',
    description:
      'Scaling daily meal service from 400 to 1,000 plates and adding two distribution points.',
    status: 'active',
    volunteerCount: 41,
    createdAt: '2026-02-22T12:45:00.000Z',
  },
  {
    id: 'project-5',
    name: 'Digital Literacy for Women',
    description:
      'Twelve-week smartphone and banking-app curriculum for self-help group members.',
    status: 'active',
    volunteerCount: 12,
    createdAt: '2026-03-05T07:20:00.000Z',
  },
  {
    id: 'project-6',
    name: 'Urban Tree Census',
    description:
      'Volunteer-led mapping of 8,000 street trees to inform the city greening plan.',
    status: 'draft',
    volunteerCount: 6,
    createdAt: '2026-03-18T15:10:00.000Z',
  },
  {
    id: 'project-7',
    name: 'Winter Shelter Night Watch',
    description: 'Overnight volunteer rota for four shelters between December and February.',
    status: 'archived',
    volunteerCount: 22,
    createdAt: '2026-03-30T19:05:00.000Z',
  },
  {
    id: 'project-8',
    name: 'Menstrual Health Awareness Drive',
    description:
      'Workshops and product distribution across 25 government schools in two districts.',
    status: 'active',
    volunteerCount: 15,
    createdAt: '2026-04-09T11:00:00.000Z',
  },
  {
    id: 'project-9',
    name: 'Old-Age Home Companion Program',
    description: 'Weekly visit pairings between student volunteers and residents.',
    status: 'draft',
    volunteerCount: 9,
    createdAt: '2026-04-24T08:35:00.000Z',
  },
  {
    id: 'project-10',
    name: 'Rainwater Harvesting Retrofit',
    description: 'Installing catchment systems in six school buildings before the next monsoon.',
    status: 'active',
    volunteerCount: 11,
    createdAt: '2026-05-06T13:25:00.000Z',
  },
  {
    id: 'project-11',
    name: 'Stray Animal Vaccination Round',
    description: 'Ward-by-ward anti-rabies drive coordinated with the municipal veterinary team.',
    status: 'draft',
    volunteerCount: 4,
    createdAt: '2026-05-19T09:50:00.000Z',
  },
  {
    id: 'project-12',
    name: 'Disaster Preparedness Training',
    description:
      'Certifying 60 community first responders in search, rescue and basic trauma care.',
    status: 'archived',
    volunteerCount: 30,
    createdAt: '2026-06-02T14:05:00.000Z',
  },
]

/** Spread across the first 6 projects so filtering by projectId always returns something. */
export const mockTasks: Task[] = [
  { id: 'task-1', projectId: 'project-1', title: 'Confirm shelter capacity with district office', done: true, createdAt: '2026-07-02T09:00:00.000Z' },
  { id: 'task-2', projectId: 'project-2', title: 'Order 30 spare robotics kits', done: false, createdAt: '2026-07-03T10:15:00.000Z' },
  { id: 'task-3', projectId: 'project-3', title: 'Schedule paediatrician for the June camp', done: true, createdAt: '2026-07-04T08:40:00.000Z' },
  { id: 'task-4', projectId: 'project-4', title: 'Source a second industrial rice cooker', done: false, createdAt: '2026-07-05T12:30:00.000Z' },
  { id: 'task-5', projectId: 'project-5', title: 'Translate module 3 into Marathi', done: false, createdAt: '2026-07-06T07:55:00.000Z' },
  { id: 'task-6', projectId: 'project-6', title: 'Finalise the tree-tagging mobile form', done: false, createdAt: '2026-07-07T16:20:00.000Z' },
  { id: 'task-7', projectId: 'project-1', title: 'Restock water purification tablets', done: false, createdAt: '2026-07-08T11:05:00.000Z' },
  { id: 'task-8', projectId: 'project-2', title: 'Run background checks on new mentors', done: true, createdAt: '2026-07-09T09:45:00.000Z' },
  { id: 'task-9', projectId: 'project-3', title: 'Print 500 bilingual consent forms', done: true, createdAt: '2026-07-10T13:10:00.000Z' },
  { id: 'task-10', projectId: 'project-4', title: 'Negotiate vegetable supplier rates', done: false, createdAt: '2026-07-11T08:25:00.000Z' },
  { id: 'task-11', projectId: 'project-5', title: 'Book the community hall for Saturdays', done: true, createdAt: '2026-07-12T15:00:00.000Z' },
  { id: 'task-12', projectId: 'project-6', title: 'Recruit 20 mapping volunteers', done: false, createdAt: '2026-07-13T10:35:00.000Z' },
  { id: 'task-13', projectId: 'project-1', title: 'Draft the relief distribution roster', done: false, createdAt: '2026-07-14T07:15:00.000Z' },
  { id: 'task-14', projectId: 'project-2', title: 'Set up the student progress tracker', done: false, createdAt: '2026-07-15T14:50:00.000Z' },
  { id: 'task-15', projectId: 'project-3', title: 'Arrange transport for the mobile unit', done: true, createdAt: '2026-07-16T09:30:00.000Z' },
  { id: 'task-16', projectId: 'project-4', title: 'Publish the weekly meal-count report', done: false, createdAt: '2026-07-17T17:40:00.000Z' },
  { id: 'task-17', projectId: 'project-5', title: 'Collect post-course feedback forms', done: false, createdAt: '2026-07-18T11:20:00.000Z' },
  { id: 'task-18', projectId: 'project-6', title: 'Validate GPS accuracy in ward 12', done: false, createdAt: '2026-07-19T08:05:00.000Z' },
  { id: 'task-19', projectId: 'project-1', title: 'Coordinate with the local fire station', done: true, createdAt: '2026-07-20T13:55:00.000Z' },
  { id: 'task-20', projectId: 'project-2', title: 'Plan the end-of-term showcase', done: false, createdAt: '2026-07-21T10:10:00.000Z' },
]
