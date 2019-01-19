import frappe from 'frappejs'
import Vue from 'vue'
import Router from 'vue-router'
import Login from '@/pages/Login'
import Discussions from '@/pages/Discussions'
import StartDiscussion from '@/pages/StartDiscussion'
import Discussion from '@/pages/Discussion'

Vue.use(Router)

const router = new Router({
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/discussions',
      name: 'Discussions',
      component: Discussions,
    },
    {
      path: '/start-a-discussion',
      name: 'StartDiscussion',
      component: StartDiscussion,
    },
    {
      path: '/discussion/:name',
      name: 'Discussion',
      component: Discussion,
      props: true,
    },
    {
      path: '*',
      redirect: '/discussions',
    },
  ],
})

router.onReady(() => {
  frappe.events.on('http:unauthorized', () => {
    router.replace('/login')
  })
})

export default router
