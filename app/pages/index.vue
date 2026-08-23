<script setup lang="ts">
interface AccountView {
  id: string
  email: string
  isOwner: boolean
}

useHead({ title: 'career-forge' })

const email = ref('')
const password = ref('')
const account = ref<AccountView | null>(null)
const unclaimed = ref<boolean | null>(null)
const message = ref('')
const busy = ref(false)
// The form submits over fetch, so the button stays disabled until Vue has hydrated. Without
// this a click that lands first would submit natively and put the password in the URL.
const ready = ref(false)

async function refresh() {
  try {
    const [me, status] = await Promise.all([
      $fetch<{ account: AccountView | null }>('/api/auth/me'),
      $fetch<{ unclaimed: boolean }>('/api/auth/status'),
    ])
    account.value = me.account
    unclaimed.value = status.unclaimed
    if (message.value.startsWith('The server is not answering')) message.value = ''
  }
  catch {
    // The scaffold has to render with Postgres down, so a failure here is reported and not thrown.
    unclaimed.value = null
    message.value = 'The server is not answering yet. Is docker compose up, and have migrations run?'
  }
}

async function submit(path: '/api/auth/signup' | '/api/auth/login') {
  busy.value = true
  message.value = ''
  try {
    const result = await $fetch<{ account: AccountView }>(path, {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    account.value = result.account
    password.value = ''
    message.value = path === '/api/auth/signup' ? 'Account created and signed in.' : 'Signed in.'
    await refresh()
  }
  catch (error) {
    message.value = (error as { statusMessage?: string }).statusMessage ?? 'That did not work.'
  }
  finally {
    busy.value = false
  }
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  account.value = null
  message.value = 'Signed out.'
  await refresh()
}

onMounted(async () => {
  ready.value = true
  await refresh()
})
</script>

<template>
  <main>
    <h1>career-forge</h1>
    <p>
      Nothing is built yet. This page exists so the scaffold can prove that an Account can sign up
      and log back in.
    </p>

    <section v-if="account">
      <p data-testid="signed-in">
        Signed in as {{ account.email }}{{ account.isOwner ? ' (Owner)' : '' }}.
      </p>
      <button
        type="button"
        @click="logout"
      >
        Sign out
      </button>
    </section>

    <form
      v-else
      @submit.prevent="submit(unclaimed ? '/api/auth/signup' : '/api/auth/login')"
    >
      <p v-if="unclaimed === true">
        Nobody has claimed this install. The first Account to sign up becomes the Owner.
      </p>
      <label>
        Email (a login name, nothing is ever sent to it)
        <input
          v-model="email"
          name="email"
          type="email"
          autocomplete="username"
          required
        >
      </label>
      <label>
        Password
        <input
          v-model="password"
          name="password"
          type="password"
          autocomplete="current-password"
          required
        >
      </label>
      <button
        type="submit"
        :disabled="busy || !ready"
      >
        {{ unclaimed ? 'Claim this install' : 'Sign in' }}
      </button>
    </form>

    <p
      v-if="message"
      data-testid="message"
    >
      {{ message }}
    </p>
  </main>
</template>

<style>
main {
  font-family: system-ui, sans-serif;
  margin: 4rem auto;
  max-width: 34rem;
  padding: 0 1rem;
}

label {
  display: block;
  margin: 0.75rem 0;
}

input {
  display: block;
  padding: 0.4rem;
  width: 100%;
}
</style>
