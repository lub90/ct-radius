<template>
  <BaseLayout>
    <template #title>
      Create Guest User
    </template>

    <LoadingGuard :state="loadingState" :error="loadingError" loading-text="Loading settings…">
      <GuestForm :username="form.username" :minUsernameLength="settings.usernameLength"
        :usernamePrefix="settings.usernamePrefix" :password="form.password" :minPasswordLength="settings.passwordLength"
        :specialChars="SYMBOLS" :vlan="form.vlan" :allowedVlans="settings.allowedVlans" :validFrom="form.validFrom"
        :validTo="form.validTo" @update="updateField" @save="saveGuest" @cancel="cancel" />
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
  vlan: null as number | null,
  validFrom: new Date(),
  validTo: new Date(Date.now() + 24 * 60 * 60 * 1000) // +1 day
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
  form.value.vlan = settings.value.defaultVlan ?? null;
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
function updateField(key: string, value: any) {
  (form.value as any)[key] = value;
}

// Save handler
async function saveGuest(payload: {
  username: string;
  password: string;
  vlan: number | null;
  validFrom: Date;
  validTo: Date;
}) {
  if (!settings.value) return;

  const fullUsername = settings.value.usernamePrefix + payload.username;

  const entry = {
    username: fullUsername,
    password: payload.password,
    assignedVlan: payload.vlan,
    valid: {
      from: payload.validFrom.toISOString(),
      to: payload.validTo.toISOString()
    }
  };

  await extensionData.createCategoryEntry("guests", entry);

  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}

// Cancel handler
function cancel() {
  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}
</script>
