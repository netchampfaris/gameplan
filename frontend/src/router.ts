import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
  type RouteLocationRaw,
  type RouteRecordRaw,
} from 'vue-router'
import { until } from '@vueuse/core'
import { session } from './data/session'
import { users, useSessionUser } from './data/users'
import { communities, getActiveCommunity } from './data/communities'
import { spaces, getSpace } from './data/spaces'
import type { Space } from './data/spaces'
import { communityState } from './data/communityState'
import { getScrollContainer, scrollTo } from './utils/scrollContainer'

declare const __FRONTEND_ROUTE__: string

type ResourceLike = {
  isFinished?: boolean
}

type RouteParamValue = string | string[]

const discussionFeeds = ['recent', 'unread', 'participating']

// Redirect-style guards still need a component record so Vue Router matches them consistently.
const RouteGuard = { render: () => null }

function routeParam(value: RouteParamValue): string {
  return Array.isArray(value) ? (value[0] ?? '') : value
}

function optionalRouteParam(value: RouteParamValue | undefined): string | undefined {
  if (!value) return undefined

  const resolvedValue = routeParam(value)
  return resolvedValue || undefined
}

const routes: RouteRecordRaw[] = [
    {
      path: '/',
      alias: '',
      component: RouteGuard,
      async beforeEnter() {
        await ensureCommunityDataLoaded()
        return getHomeRoute()
      },
    },
    {
      path: '/home',
      name: 'Home',
      component: RouteGuard,
      async beforeEnter() {
        await ensureCommunityDataLoaded()
        return getHomeRoute()
      },
    },
    {
      path: '/community',
      component: RouteGuard,
      async beforeEnter() {
        await ensureCommunityDataLoaded()
        return getHomeRoute()
      },
    },
    {
      path: '/community/:communityId',
      redirect: (to) => ({
        name: 'Discussions',
        params: { communityId: routeParam(to.params.communityId) },
      }),
    },
    {
      name: 'Discussions',
      path: '/community/:communityId/discussions',
      component: () => import('@/pages/Discussions.vue'),
      props: true,
      meta: { communityScope: true },
    },
    {
      name: 'DiscussionsTab',
      path: '/community/:communityId/discussions/:feedType',
      component: () => import('@/pages/Discussions.vue'),
      props: true,
      meta: { communityScope: true },
      beforeEnter(to) {
        const feedType = routeParam(to.params.feedType)

        if (feedType === 'bookmarks') {
          return { name: 'Bookmarks' }
        }

        if (discussionFeeds.includes(feedType)) {
          return
        }

        return {
          name: 'DiscussionsTab',
          params: { communityId: routeParam(to.params.communityId), feedType: 'recent' },
          replace: true,
        }
      },
    },
    {
      path: '/discussions',
      component: RouteGuard,
      async beforeEnter() {
        await ensureCommunityDataLoaded()

        // `/discussions` stays as a compatibility entry point, but there is no global feed anymore.
        if (!communityState.id) {
          return getHomeRoute()
        }

        return {
          name: 'Discussions',
          params: { communityId: communityState.id },
        }
      },
    },
    {
      path: '/discussions/:feedType',
      component: RouteGuard,
      async beforeEnter(to) {
        await ensureCommunityDataLoaded()

        const feedType = routeParam(to.params.feedType)
        if (feedType === 'bookmarks') {
          return { name: 'Bookmarks' }
        }

        if (!communityState.id) {
          return getHomeRoute()
        }

        return {
          name: 'DiscussionsTab',
          params: {
            communityId: communityState.id,
            feedType: discussionFeeds.includes(feedType) ? feedType : 'recent',
          },
        }
      },
    },
    {
      name: 'Bookmarks',
      path: '/bookmarks',
      component: () => import('@/pages/Bookmarks.vue'),
    },
    {
      name: 'Drafts',
      path: '/drafts',
      component: () => import('@/pages/Drafts.vue'),
    },
    {
      name: 'MyTasks',
      path: '/tasks',
      component: () => import('@/pages/MyTasks.vue'),
    },
    {
      name: 'Task',
      path: '/task/:taskId',
      component: () => import('@/pages/Task.vue'),
      props: true,
    },
    {
      name: 'MyPages',
      path: '/pages',
      component: () => import('@/pages/MyPages.vue'),
    },
    {
      name: 'Page',
      path: '/page/:pageId/:slug?',
      component: () => import('@/pages/Page.vue'),
      props: true,
    },
    {
      path: '/people',
      name: 'People',
      component: () => import('@/pages/People.vue'),
    },
    {
      path: '/search',
      name: 'Search',
      component: () => import('@/pages/Search.vue'),
    },
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('@/pages/Onboarding.vue'),
      async beforeEnter() {
        await ensureCommunityDataLoaded()

        if (hasAnyData()) {
          return getHomeRoute()
        }
      },
    },
    {
      path: '/no-communities',
      name: 'NoCommunities',
      component: () => import('@/pages/NoCommunities.vue'),
    },
    {
      path: '/404',
      name: 'NotFound',
      component: () => import('@/pages/NotFound.vue'),
    },
    {
      path: '/list',
      name: 'Teams',
      component: () => import('@/pages/Teams.vue'),
    },
    {
      path: '/spaces',
      name: 'Spaces',
      component: () => import('@/pages/Spaces/Spaces.vue'),
      // `/spaces` is an admin-only global housekeeping page; non-admins never reach it.
      async beforeEnter() {
        await ensureCommunityDataLoaded()

        if (useSessionUser().role !== 'Gameplan Admin') {
          return getHomeRoute()
        }
      },
    },
    {
      name: 'Space',
      path: '/community/:communityId/space/:spaceId',
      component: () => import('@/pages/Space.vue'),
      redirect: { name: 'SpaceDiscussions' },
      props: true,
      meta: { communityScope: true },
      children: [
        {
          name: 'SpaceDiscussions',
          path: 'discussions',
          component: () => import('@/pages/SpaceDiscussions.vue'),
          props: true,
          meta: { communityScope: true },
        },
        {
          name: 'SpacePages',
          path: 'pages',
          component: () => import('@/pages/SpacePages.vue'),
          props: true,
          meta: { communityScope: true },
        },
        {
          name: 'SpacePage',
          path: 'pages/:pageId/:slug?',
          component: () => import('@/pages/Page.vue'),
          props: true,
          meta: { hideHeader: true, communityScope: true },
        },
        {
          name: 'SpaceTasks',
          path: 'tasks',
          component: () => import('@/pages/SpaceTasks.vue'),
          props: true,
          meta: { communityScope: true },
        },
        {
          name: 'SpaceTask',
          path: 'tasks/:taskId',
          component: () => import('@/pages/Task.vue'),
          props: true,
          meta: { hideHeader: true, communityScope: true },
        },
      ],
    },
    {
      name: 'Discussion',
      path: '/community/:communityId/space/:spaceId/discussion/:postId/:slug?',
      component: () => import('@/pages/SpaceDiscussion.vue'),
      props: true,
      meta: { communityScope: true },
    },
    {
      name: 'NewDiscussion',
      path: '/community/:communityId/new-discussion',
      component: () => import('@/pages/NewDiscussion/NewDiscussion.vue'),
      meta: { communityScope: true },
    },
    {
      name: 'LegacyNewDiscussion',
      path: '/new-discussion',
      component: () => import('@/pages/NewDiscussion/NewDiscussion.vue'),
    },
    {
      name: 'NewSpace',
      path: '/community/:communityId/new-space',
      component: () => import('@/pages/NewSpace.vue'),
      props: true,
      meta: { communityScope: true },
    },
    {
      path: '/people/:personId',
      name: 'PersonProfile',
      component: () => import('@/pages/PersonProfile.vue'),
      props: true,
      redirect: { name: 'PersonProfileAboutMe' },
      children: [
        {
          name: 'PersonProfileAboutMe',
          path: '',
          component: () => import('@/pages/PersonProfileAboutMe.vue'),
        },
        {
          name: 'PersonProfilePosts',
          path: 'posts',
          component: () => import('@/pages/PersonProfilePosts.vue'),
        },
        {
          name: 'PersonProfileReplies',
          path: 'replies',
          component: () => import('@/pages/PersonProfileReplies.vue'),
        },
        {
          name: 'PersonProfileBookmarks',
          path: 'bookmarks',
          redirect: { name: 'Bookmarks' },
        },
      ],
    },
    {
      path: '/notifications',
      name: 'Notifications',
      component: () => import('@/pages/Notifications.vue'),
    },
    {
      path: '/more',
      name: 'More',
      component: () => import('@/pages/MoreMenu.vue'),
    },
    // Keep old shared space links working while moving canonical URLs under `/community/:communityId/...`.
    {
      path: '/space/:spaceId',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'Space',
          params: {
            communityId: space.team,
            spaceId: space.name,
          },
        }
      },
    },
    {
      path: '/space/:spaceId/discussions',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'SpaceDiscussions',
          params: {
            communityId: space.team,
            spaceId: space.name,
          },
        }
      },
    },
    {
      path: '/space/:spaceId/pages',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'SpacePages',
          params: {
            communityId: space.team,
            spaceId: space.name,
          },
          hash: to.hash,
        }
      },
    },
    {
      path: '/space/:spaceId/pages/:pageId/:slug?',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'SpacePage',
          params: {
            communityId: space.team,
            spaceId: space.name,
            pageId: routeParam(to.params.pageId),
            slug: optionalRouteParam(to.params.slug),
          },
          query: to.query,
          hash: to.hash,
        }
      },
    },
    {
      path: '/space/:spaceId/tasks',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'SpaceTasks',
          params: {
            communityId: space.team,
            spaceId: space.name,
          },
        }
      },
    },
    {
      path: '/space/:spaceId/tasks/:taskId',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'SpaceTask',
          params: {
            communityId: space.team,
            spaceId: space.name,
            taskId: routeParam(to.params.taskId),
          },
          query: to.query,
        }
      },
    },
    {
      path: '/space/:spaceId/discussion/:postId/:slug?',
      component: RouteGuard,
      async beforeEnter(to) {
        const space = await findSpace(routeParam(to.params.spaceId))

        if (!space?.team) {
          return { name: 'NotFound' }
        }

        return {
          name: 'Discussion',
          params: {
            communityId: space.team,
            spaceId: space.name,
            postId: routeParam(to.params.postId),
            slug: optionalRouteParam(to.params.slug),
          },
          query: to.query,
          hash: to.hash,
        }
      },
    },
    {
      path: '/:teamId',
      name: 'TeamLayout',
      component: () => import('@/pages/TeamLayout.vue'),
      redirect: { name: 'Team' },
      props: true,
      children: [
        {
          name: 'Team',
          path: '',
          component: () => import('@/pages/Team.vue'),
          redirect: (to) => ({
            name: 'Discussions',
            params: { communityId: routeParam(to.params.teamId) },
          }),
          props: true,
          children: [
            {
              name: 'TeamOverview',
              path: '',
              redirect: (to) => ({
                name: 'Discussions',
                params: { communityId: routeParam(to.params.teamId) },
              }),
            },
            {
              name: 'TeamDiscussions',
              path: 'discussions',
              redirect: (to) => ({
                name: 'Discussions',
                params: { communityId: routeParam(to.params.teamId) },
              }),
            },
          ],
        },
        {
          name: 'ProjectLayout',
          path: 'projects/:projectId',
          component: () => import('@/pages/ProjectLayout.vue'),
          props: true,
          redirect: { name: 'Project' },
          children: [
            {
              name: 'Project',
              path: '',
              component: () => import('@/pages/Project.vue'),
              redirect: { name: 'ProjectOverview' },
              props: true,
              children: [
                {
                  name: 'ProjectOverview',
                  path: '',
                  redirect: (to) => ({
                    name: 'Space',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                    },
                  }),
                },
                {
                  name: 'ProjectDiscussions',
                  path: 'discussions',
                  redirect: (to) => ({
                    name: 'SpaceDiscussions',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                    },
                  }),
                },
                {
                  name: 'ProjectDiscussion',
                  path: 'discussion/:postId/:slug?',
                  redirect: (to) => ({
                    name: 'Discussion',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                      postId: routeParam(to.params.postId),
                      slug: optionalRouteParam(to.params.slug),
                    },
                    query: to.query,
                    hash: to.hash,
                  }),
                },
                {
                  name: 'ProjectDiscussionNew',
                  path: 'discussions/new',
                  redirect: (to) => ({
                    name: 'NewDiscussion',
                    params: {
                        communityId: routeParam(to.params.teamId),
                    },
                    query: {
                      ...to.query,
                      spaceId: routeParam(to.params.projectId),
                    },
                  }),
                },
                {
                  name: 'ProjectTasks',
                  path: 'tasks',
                  redirect: (to) => ({
                    name: 'SpaceTasks',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                    },
                  }),
                },
                {
                  name: 'ProjectTaskDetail',
                  path: 'task/:taskId',
                  meta: { fullWidth: true },
                  redirect: (to) => ({
                    name: 'SpaceTask',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                      taskId: routeParam(to.params.taskId),
                    },
                    query: to.query,
                  }),
                },
                {
                  name: 'ProjectPages',
                  path: 'pages',
                  redirect: (to) => ({
                    name: 'SpacePages',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                    },
                    hash: to.hash,
                  }),
                },
                {
                  name: 'ProjectPage',
                  path: 'pages/:pageId/:slug?',
                  meta: { fullWidth: true, hideHeader: true },
                  redirect: (to) => ({
                    name: 'SpacePage',
                    params: {
                      communityId: routeParam(to.params.teamId),
                      spaceId: routeParam(to.params.projectId),
                      pageId: routeParam(to.params.pageId),
                      slug: optionalRouteParam(to.params.slug),
                    },
                    query: to.query,
                    hash: to.hash,
                  }),
                },
              ],
            },
          ],
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: { name: 'NotFound' },
    },
]

const router = createRouter({
  history: createWebHistory(__FRONTEND_ROUTE__ + '/'),
  routes,
})

const scrollPositions: Record<string, number> = {}

function saveAndRestoreScrollPosition(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
) {
  let scrollContainer = getScrollContainer()
  if (scrollContainer) {
    scrollPositions[from.path] = scrollContainer.scrollTop
  }
  if (scrollPositions[to.path] !== undefined && to.path !== from.path) {
    setTimeout(() => {
      scrollTo({ top: scrollPositions[to.path] })
    }, 0)
  }
}

router.beforeEach(async (to, from) => {
  saveAndRestoreScrollPosition(to, from)

  if (to.name === 'Login' && session.isLoggedIn) {
    return { name: 'Home' }
  }

  if (to.name !== 'Login' && !session.isLoggedIn) {
    window.location.href = '/login'
    return { name: 'Login' }
  }

  if (!users.isFinished) {
    try {
      await users.promise
    } catch (error) {
      console.error('Error loading users', error)
    }
  }

  await ensureCommunityDataLoaded()

  if (['/', '/home', '/community'].includes(to.path)) {
    return getHomeRoute()
  }

  if (!to.matched.some((route) => route.meta?.communityScope)) {
    return
  }

  let communityId = routeParam(to.params.communityId)

  // Invalid community URLs should fail loudly instead of silently switching shell state.
  if (!getActiveCommunity(communityId)) {
    return { name: 'NotFound' }
  }

  if (!to.params.spaceId) {
    return
  }

  let space = getSpace(routeParam(to.params.spaceId))

  // A scoped space URL is only valid inside the community that owns that space.
  if (!space || space.team !== communityId) {
    return { name: 'NotFound' }
  }
})

export default router

async function ensureCommunityDataLoaded() {
  await Promise.all([waitForResource(communities), waitForResource(spaces)])
}

async function waitForResource(resource: ResourceLike) {
  if (resource?.isFinished) {
    return
  }

  await until(() => resource?.isFinished).toBe(true)
}

function getHomeRoute(): RouteLocationRaw {
  // Home resolves to the active community when possible; onboarding stays only for truly empty sites.
  if (communityState.id) {
    return {
      name: 'Discussions',
      params: { communityId: communityState.id },
    }
  }

  if (!hasAnyData()) {
    return { name: 'Onboarding' }
  }

  // The site has communities/spaces but the user has joined none. Admins manage
  // them on the global Spaces page; everyone else sees the no-communities state.
  if (useSessionUser().role === 'Gameplan Admin') {
    return { name: 'Spaces' }
  }

  return { name: 'NoCommunities' }
}

function hasAnyData(): boolean {
  return (communities.data?.length ?? 0) > 0 || (spaces.data?.length ?? 0) > 0
}

async function findSpace(spaceId: string): Promise<Space | null> {
  await ensureCommunityDataLoaded()
  return getSpace(spaceId)
}
