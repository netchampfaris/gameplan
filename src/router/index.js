import frappe from 'frappejs';
import Vue from 'vue';
import Router from 'vue-router';
import Login from '@/pages/Login';
import Discussions from '@/pages/Discussions';
import StartDiscussion from '@/pages/StartDiscussion';
import Discussion from '@/pages/Discussion';

Vue.use(Router);

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
    },
  ],
});

router.beforeEach((to, from, next) => {
  // const currentUser = frappe.session;
  // console.log(currentUser)
  // let requiresAuth = to.matched.some(record => record.meta.requiresAuth)

  // if (requiresAuth && !currentUser) next('login');
  // else if (!requiresAuth && currentUser) next('/');
  next()
});

export default router;