<template>
  <div class="flex h-full min-h-0 flex-col">
    <h2 class="text-3xl-semibold leading-none text-ink-gray-9">Account</h2>
    <p class="mt-2 max-w-2xl text-p-base leading-relaxed text-ink-gray-5">
      Login and account-level actions.
    </p>
    <div class="mt-8 overflow-y-auto pb-16">
      <div class="border-b border-outline-gray-1 py-5 first:pt-0">
        <h3 class="text-base-semibold text-ink-gray-9">Security</h3>
        <div class="mt-3 space-y-3">
          <a href="/update-password">
            <Button variant="solid">Update password</Button>
          </a>
          <div class="text-p-sm text-ink-gray-5">Session management can live here later.</div>
        </div>
      </div>
    </div>
  </div>
</template>
