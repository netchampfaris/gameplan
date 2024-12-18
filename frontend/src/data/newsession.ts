import { computed, MaybeRef, reactive, ref } from 'vue'
import { createResource } from 'frappe-ui'
import { users } from './users'
import router from '@/router'
import { useCall } from 'frappe-ui/src/data-fetching'

interface LoginResponse {
  user: string
  default_route?: string
}

interface LoginParams {
  usr: MaybeRef<string>
  pwd: MaybeRef<string>
}

type LogoutResponse = void

export let sessionUser = ref<string | null>(getSessionUserFromCookie())

export let session = reactive({
  login: useCall<LoginResponse, LoginParams>({
    url: '/api/v2/method/login',
    // refetch: true,
    onSuccess(data) {
      //   users.reload()
      sessionUser.value = getSessionUserFromCookie()
      session.login.reset()
      router.replace(data.default_route || '/')
    },
  }),
  logout: useCall<LogoutResponse>({
    url: '/api/v2/method/logout',
    onSuccess() {
      //   users.reset()
      sessionUser.value = getSessionUserFromCookie()
      router.replace({ name: 'Login' })
    },
  }),
  user: sessionUser,
  isLoggedIn: computed(() => sessionUser != null),
})

function getSessionUserFromCookie() {
  let cookies = new URLSearchParams(document.cookie.split('; ').join('&'))
  let _sessionUser = cookies.get('user_id')
  if (_sessionUser === 'Guest') {
    _sessionUser = null
  }
  return _sessionUser
}
