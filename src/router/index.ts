import { createRouter, createWebHistory } from 'vue-router'
import OpusWebapp from '@/screens/OpusWebapp.vue'
import ProjectDetail from '@/components/ProjectDetail.vue'
import Globe from '@/components/Globe.vue'
import DonatePage from '@/screens/DonatePage.vue'
import DonateThanks from '@/screens/DonateThanks.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: OpusWebapp
  },
  {
    path: '/observatory',
    name: 'Observatory',
    component: OpusWebapp,
    props: { initialView: 'observatory' }
  },
  {
    path: '/project/:slug',
    name: 'ProjectDetail',
    component: ProjectDetail,
    props: true
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: OpusWebapp,
    props: { initialView: 'dashboard' }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: OpusWebapp,
    props: { initialView: 'profile' }
  },
  {
    path: '/login',
    name: 'Login',
    component: OpusWebapp,
    props: { initialView: 'login' }
  },
  {
    path: '/globe',
    name: 'Globe',
    component: Globe
  },
  {
    path: '/donate',
    name: 'Donate',
    component: DonatePage
  },
  {
    path: '/donate/thanks',
    name: 'DonateThanks',
    component: DonateThanks
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL || '/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// Update page title based on route
router.beforeEach((to, from, next) => {
  const titles: { [key: string]: string } = {
    'Home': 'Orangopus',
    'Observatory': 'News Observatory - Orangopus',
    'Dashboard': 'Dashboard - Orangopus',
    'Profile': 'Profile - Orangopus',
    'Login': 'Sign in - Orangopus',
    'ProjectDetail': 'Project Details - Orangopus',
    'Globe': 'Earth Data Globe - Orangopus',
    'Donate': 'Donate - Orangopus',
    'DonateThanks': 'Thank you - Orangopus'
  }
  
  const title = titles[to.name as string] || 'Orangopus'
  document.title = title
  
  next()
})

export default router 