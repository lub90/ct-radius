<template>
  <BaseLayout>
    <template #title>
      Edit Guest User
    </template>

    <LoadingGuard :state="loadingState" :error="loadingError" loading-text="Loading guest user…">
      <GuestForm
        v-if="guest && settings"
        :guest="guest"
        :settings="settings"
        @update="updateGuest"
        @save="saveGuest"
        @cancel="cancel"
      />

      <v-alert v-else type="error" variant="tonal" border="start">
        Guest user not found.
      </v-alert>
    </LoadingGuard>
  </BaseLayout>
</template>

<script setup lang="ts">
import { ref, inject } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseLayout from "../layouts/BaseLayout.vue";
import GuestForm from "../components/GuestForm.vue";
import LoadingGuard from "@/ct-extension-utils/components/LoadingGuard.vue";
import { loadWithState } from "@/ct-extension-utils/composables/loadWithState";
import { ExtensionData } from "@/ct-utils/lib/ExtensionData";
import { EXTENSION } from "@/constants";
import { GuestUserSchema } from "@/../../typescript/src/core/modules/ct-guests/GuestUser";
import { SettingsSchema } from "@/types/SettingsSchema";
import type { Settings } from "@/types/SettingsSchema";

// Router + CT client
const route = useRoute();
const router = useRouter();
const churchtoolsClient = inject<any>("churchtoolsClient");

// Extension data handler
const extensionData = new ExtensionData(churchtoolsClient, EXTENSION.KEY);

// Reactive settings + guest
const settings = ref<Settings | null>(null);
const guest = ref<any | null>(null);

// Load settings + guest
const { state: loadingState, error: loadingError } = loadWithState(async () => {
  // Load settings
  const rawSettings = await extensionData.getCategoryData("settings", true);
  settings.value = SettingsSchema.parse(JSON.parse(rawSettings.value));

  // Load guest by ID
  const id = Number(route.params.id);
  const entry = await extensionData.getCategoryEntry("guests", id);

  if (!entry) return null;

  const parsed = GuestUserSchema.parse(JSON.parse(entry.value));

  const prefix = settings.value.usernamePrefix ?? "";

  let usernameWithoutPrefix = parsed.username;
  if (prefix && parsed.username.startsWith(prefix)) {
    usernameWithoutPrefix = parsed.username.slice(prefix.length);
  }

  guest.value = {
    id,
    username: usernameWithoutPrefix,
    password: parsed.password,
    assignedVlan: parsed.assignedVlan ?? null,
    valid: {
      from: new Date(parsed.valid.from),
      to: new Date(parsed.valid.to)
    },
    comment: parsed.comment ?? ""
  };
  
});


// Update handler from GuestForm
function updateGuest(updatedGuest: any) {
  guest.value = updatedGuest;
}

// Save handler
async function saveGuest(updatedGuest: any) {
  if (!settings.value || !guest.value) return;

  const entry = {
    username: (settings.value.usernamePrefix ?? "") + updatedGuest.username,
    password: updatedGuest.password,
    assignedVlan: updatedGuest.assignedVlan,
    valid: {
      from: updatedGuest.valid.from.toISOString(),
      to: updatedGuest.valid.to.toISOString()
    },
    comment: updatedGuest.comment ?? ""
  };

  await extensionData.updateCategoryEntry("guests", guest.value.id, entry);

  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}

// Cancel handler
function cancel() {
  router.push(`${EXTENSION.URL_PREFIX}/guests`);
}
</script>
