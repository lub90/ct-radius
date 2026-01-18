<template>
  <BaseLayout>
    <template #title>
      Create Guest User
    </template>

    <LoadingGuard :state="loadingState" :error="loadingError" loading-text="Loading settings…">
      <GuestForm
        :guest="form"
        :settings="settings"
        @update="updateGuest"
        @save="saveGuest"
        @cancel="cancel"
      />

    </LoadingGuard>
  </BaseLayout>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import BaseLayout from "../layouts/BaseLayout.vue";
import GuestForm from "../components/GuestForm.vue";
import LoadingGuard from "@/ct-extension-utils/components/LoadingGuard.vue";
import { loadWithState } from "@/ct-extension-utils/composables/loadWithState";
import { ExtensionData } from "@/ct-utils/lib/ExtensionData";
import { EXTENSION } from "@/constants";
import { SettingsSchema } from "@/types/SettingsSchema";
import type { Settings } from "@/types/SettingsSchema";
import { SYMBOLS } from '@/../../typescript/src/types/isAllowedString';

// Router + CT client
const router = useRouter();
const churchtoolsClient = inject<any>("churchtoolsClient");

// Extension data handler
const extensionData = new ExtensionData(churchtoolsClient, EXTENSION.KEY);

// Reactive settings
const settings = ref<Settings | null>(null);

// Initial form state
const form = ref({
  username: "",
  password: "",
  assignedVlan: null,
  valid: {
    from: new Date(),
    to: new Date(Date.now() + 24 * 60 * 60 * 1000)
  },
  comment: ""
});

// Load settings
const {
  state: loadingState,
  error: loadingError
} = loadWithState(async () => {
  const raw = await extensionData.getCategoryData("settings", true);
  settings.value = SettingsSchema.parse(JSON.parse(raw.value));

  // Pre-fill username prefix
  form.value.username = generateRandomUsername(settings.value.usernameLength);
  form.value.password = generateRandomPassword(
    settings.value.passwordLength,
    SYMBOLS
  );
  form.value.assignedVlan = settings.value.defaultVlan ?? null;
});

function generateRandomUsername(minLength: number): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  let result = "";

  for (let i = 0; i < minLength; i++) {
    result += letters[Math.floor(Math.random() * letters.length)];
  }

  return result;
}

function generateRandomPassword(minLength: number, specialChars: string): string {
  const letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";

  // Ensure required components
  const required = [
    digits[Math.floor(Math.random() * digits.length)],
    specialChars[Math.floor(Math.random() * specialChars.length)]
  ];

  // Fill the rest with allowed characters
  const all = letters + digits + specialChars;
  while (required.length < minLength) {
    required.push(all[Math.floor(Math.random() * all.length)]);
  }

  // Shuffle for randomness
  return required.sort(() => Math.random() - 0.5).join("");
}


// Update handler from GuestForm
function updateGuest(updatedGuest: any) {
  form.value = updatedGuest;
}


// Save handler
async function saveGuest(guest: any) {
  if (!settings.value) return;

  const entry = {
    username: settings.value.usernamePrefix + guest.username,
    password: guest.password,
    assignedVlan: guest.assignedVlan,
    valid: {
      from: guest.valid.from.toISOString(),
      to: guest.valid.to.toISOString()
    },
    comment: guest.comment ?? ""
  };

  await extensionData.createCategoryEntry("guests", entry);

  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}

// Cancel handler
function cancel() {
  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}
</script>
