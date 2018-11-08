<template>
  <div class="page-login">
    <div class="login-box">
    <h1>Gameplan</h1>
    <div class="control">
        <input type="text" name="email" placeholder="User name"
          :class="{danger: invalid}" v-model="email" @click="invalid = false"
        >
        <div v-if="invalid" class="danger-message danger">Nope.</div>
    </div>
    <div class="control">
        <input type="password" name="password" placeholder="••••••••"
          v-model="password" @keydown.enter="login" @click="invalid = false"
        >
    </div>
    <div class="login-buttons">
        <a href @click.prevent="signup">Sign Up</a>
        <a href @click.prevent="login">Login</a>
    </div>
    </div>
  </div>
</template>

<script>
import frappe from 'frappejs';

export default {
  name: 'Login',
  data() {
    return {
      email: '',
      password: '',
      invalid: false,
    };
  },
  methods: {
    async login() {
      if (this.email && this.password) {
        frappe.session = {};
        await frappe.login(this.email, this.password);

        if (frappe.session.token) {
          frappe.session.fullName = await frappe.db.getValue(
            'User',
            this.email,
            'fullName',
          );
          localStorage.setItem('session', JSON.stringify(frappe.session));
          await frappe.getSingle('SystemSettings');
          this.$router.push({ path: 'discussions' });
        } else {
          this.invalid = true;
        }
      }
    },
    async signup() {
      if (this.email && this.password) {
        frappe.signup(this.email, this.email, this.password).then((res) => {
          if (res.status && res.status !== 200) {
            this.invalid = true;
            return;
          }

          this.login();
        });
      }
    },
  },
};
</script>

<style scoped>
.page-login {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateY(-10%);
}

h1 {
  font-family: 'Avenir';
  text-transform: uppercase;
  letter-spacing: 1rem;
  color: var(--text-grey);
  margin-bottom: 4rem;
  font-weight: 900;
}

.control {
  text-align: left;
  margin-top: 1rem;
  position: relative;
}

input {
  padding: 1rem 0;
}

.danger {
  color: var(--danger);
  border-bottom-color: var(--danger);
}

.danger-message {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

input[type='password'] {
  letter-spacing: 5px;
}

input:-webkit-autofill {
  box-shadow: 0 0 0 30px var(--light-bg) inset;
}

.login-buttons {
  display: flex;
  justify-content: space-between;
  color: var(--text-blue);
  margin-top: 3rem;
  font-size: 1.5rem;
}

.login-buttons a {
  text-decoration: none;
  color: var(--text-blue);
}

.login-buttons a:visited {
  color: var(--text-blue);
}
</style>
