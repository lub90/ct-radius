<template>
  <BaseLayout>
    <template #title>
      Delete guest user
    </template>

    <LoadingGuard :state="state" :error="error" loading-text="Loading guest user…">
      <div v-if="guest">
        <v-alert
          type="warning"
          variant="tonal"
          border="start"
          class="mb-4"
          style="border: 1px solid;"
        >
          Are you sure you want to delete this guest user?
        </v-alert>

        <v-card variant="outlined" class="mb-6">
          <v-card-title class="text-h6">User details</v-card-title>
          <v-divider />

          <v-card-text>
            <v-row dense class="mb-2">
              <v-col cols="4" class="text-medium-emphasis">Username</v-col>
              <v-col cols="8" class="font-weight-medium">{{ guest.username }}</v-col>
            </v-row>

            <v-row dense class="mb-2">
              <v-col cols="4" class="text-medium-emphasis">Valid from</v-col>
              <v-col cols="8" class="font-weight-medium">{{ guest.validFrom.toLocaleString() }}</v-col>
            </v-row>

            <v-row dense class="mb-2">
              <v-col cols="4" class="text-medium-emphasis">Valid to</v-col>
              <v-col cols="8" class="font-weight-medium">{{ guest.validTo.toLocaleString() }}</v-col>
            </v-row>

            <v-row dense>
              <v-col cols="4" class="text-medium-emphasis">VLAN</v-col>
              <v-col cols="8" class="font-weight-medium">{{ guest.vlan ?? '-' }}</v-col>
            </v-row>
          </v-card-text>
        </v-card>


        <div class="d-flex flex-wrap gap-4">
          <v-btn
            color="primary"
            variant="outlined"
            prepend-icon="mdi-cancel"
            @click="cancel"
          >
            Cancel
          </v-btn>

          &nbsp;

          <v-btn
            color="error"
            variant="flat"
            prepend-icon="mdi-delete"
            @click="confirmDelete"
          >
            Yes, delete this user
          </v-btn>
        </div>
      </div>

      <v-alert v-else type="error" variant="tonal" border="start">
        Guest user not found.
      </v-alert>
    </LoadingGuard>
  </BaseLayout>
</template>

<script setup lang="ts">
import { inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseLayout from '../layouts/BaseLayout.vue'
import LoadingGuard from '@/ct-extension-utils/components/LoadingGuard.vue'
import { loadWithState } from '@/ct-extension-utils/composables/loadWithState'
import { ExtensionData } from '@/ct-utils/lib/ExtensionData'
import { GuestUserSchema } from '@/../../typescript/src/core/modules/ct-guests/GuestUser'
import { EXTENSION } from '@/constants'

// Router
const route = useRoute()
const router = useRouter()

// Inject ChurchTools client
const churchtoolsClient = inject<any>('churchtoolsClient')

// Extension data handler
const extensionData = new ExtensionData(churchtoolsClient, EXTENSION.KEY)

// Load guest using your composable
const { state, error, data: guest } = loadWithState(async () => {
  const id = Number(route.params.id)
  const entry = await extensionData.getCategoryEntry('guests', id)

  if (!entry) return null

  const parsed = GuestUserSchema.parse(JSON.parse(entry.value))

  return {
    id,
    username: parsed.username,
    validFrom: new Date(parsed.valid.from),
    validTo: new Date(parsed.valid.to),
    vlan: parsed.assignedVlan ?? null,
    raw: parsed
  }
})

// Actions
async function confirmDelete() {
  if (!guest.value) return

  await extensionData.deleteCategoryEntry('guests', guest.value.id)
  router.push(`${EXTENSION.URL_PREFIX}/guests`)
}

function cancel() {
  router.push(`${EXTENSION.URL_PREFIX}/guests`)
}
</script>
