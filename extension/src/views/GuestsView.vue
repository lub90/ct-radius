<template>
  <BaseLayout>

    <template #title>
      WiFi Guest users
    </template>

    <div class="d-flex justify-space-between align-center mb-4">
      <!-- Filter Buttons -->
      <v-btn-toggle v-model="filter" mandatory class="mb-4">
        <v-btn value="all" variant="outlined" color="primary">All</v-btn>
        <v-btn value="valid" variant="outlined" color="primary">Valid</v-btn>
        <v-btn value="current" variant="outlined" color="primary">Currently Valid</v-btn>
        <v-btn value="expired" variant="outlined" color="primary">Expired</v-btn>
      </v-btn-toggle>

      <!-- Add Guest Button -->
      <v-btn color="accent" variant="outlined" prepend-icon="mdi-plus" @click="addGuest">
        Add guest user
      </v-btn>
    </div>


    <!-- Data Table -->
    <v-data-table :headers="headers" :items="filteredRows" fixed-header height="70vh" class="elevation-1"
      density="comfortable" item-key="id" :items-per-page="-1">

      <!-- Format columns -->
      <template #item.validFrom="{ item }">
        {{ item.validFrom.toLocaleString() }}
      </template>

      <template #item.validTo="{ item }">
        {{ item.validTo.toLocaleString() }}
      </template>

      <template #item.vlan="{ item }">
        {{ getVlanName(item.vlan) }}
      </template>


      <!-- Tools column -->
      <template #item.actions="{ item }">
        <v-btn icon size="small" color="primary" rounded="sm" variant="outlined" @click="editGuest(item.id)">
          <v-icon>mdi-pencil</v-icon>
        </v-btn>
        &nbsp;
        <v-btn icon size="small" color="primary" rounded="sm" variant="outlined" @click="printGuest(item.id)">
          <v-icon>mdi-printer</v-icon>
        </v-btn>
        &nbsp;
        <v-btn icon size="small" color="error" rounded="sm" variant="outlined" @click="deleteGuest(item.id)">
          <v-icon>mdi-delete</v-icon>
        </v-btn>
      </template>

    </v-data-table>

    <!-- Hidden print content -->
    <div ref="printRef" style="display:none;">
      <GuestPrintContent v-if="printGuestData" :guest="printGuestData" :ssid="settings.guestSSID" />
    </div>

  </BaseLayout>
</template>



<script setup lang="ts">
import { ref, computed, onMounted, inject, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { GuestUserSchema, type GuestUser } from '@/../../typescript/src/core/modules/ct-guests/GuestUser'
import { ExtensionData } from '@/ct-utils/lib/ExtensionData'
import { EXTENSION } from '@/constants'
import BaseLayout from '../layouts/BaseLayout.vue'
import GuestPrintContent from '../components/GuestPrintContent.vue'
import { SettingsSchema } from '@/types/SettingsSchema'
import type { Settings } from '@/types/SettingsSchema'


// Inject ChurchTools client
const churchtoolsClient = inject<any>('churchtoolsClient')
const router = useRouter()

// Extension data handler
const extensionData = new ExtensionData(churchtoolsClient, EXTENSION.KEY)

// Parsed rows for the table
type GuestRow = {
  id: number
  username: string
  validFrom: Date
  validTo: Date
  vlan: number | null
  raw: GuestUser
}

const rows = ref<GuestRow[]>([])
const settings = ref<Settings | null>(null)


// Filter state
const filter = ref<'all' | 'valid' | 'current' | 'expired'>('valid')

// Table headers
const headers = [
  { title: 'Username', key: 'username', sortable: true },
  { title: 'Valid From', key: 'validFrom', sortable: true },
  { title: 'Valid To', key: 'validTo', sortable: true },
  { title: 'VLAN ID', key: 'vlan', sortable: true },
  { title: '', key: 'actions', sortable: false }
]

// Load data
async function loadGuests() {
  const entries = await extensionData.getCategoryData('guests')

  rows.value = entries.map((entry: any) => {
    const parsed = GuestUserSchema.parse(JSON.parse(entry.value))

    return {
      id: entry.id,
      username: parsed.username,
      validFrom: new Date(parsed.valid.from),
      validTo: new Date(parsed.valid.to),
      vlan: parsed.assignedVlan ?? null,
      raw: parsed
    }
  })
}


async function loadSettings() {
  const rawSettings = await extensionData.getCategoryData('settings', true);
  settings.value = SettingsSchema.parse(JSON.parse(rawSettings.value));
}

onMounted(async () => {
  await loadSettings();
  await loadGuests();
})

// Filter helpers
function isExpired(g: GuestRow) {
  return g.validTo < new Date()
}

function isCurrent(g: GuestRow) {
  const now = new Date()
  return g.validFrom <= now && now <= g.validTo
}

// Apply filter
const filteredRows = computed(() => {
  switch (filter.value) {
    case 'valid':
      return rows.value.filter(r => !isExpired(r))
    case 'current':
      return rows.value.filter(r => isCurrent(r))
    case 'expired':
      return rows.value.filter(r => isExpired(r))
    default:
      return rows.value
  }
})

function getVlanName(id: number | null): string {
  if (!id || !settings.value) return '-'

  const match = settings.value.allowedVlans?.find((v: any) => v.id === id)
  return match ? `${id} (${match.name})` : `${id}`
}


// Actions
function editGuest(id: number) {
  router.push(`${EXTENSION.URL_PREFIX}/guests/${id}/edit`)
}

function deleteGuest(id: number) {
  router.push(`${EXTENSION.URL_PREFIX}/guests/${id}/delete`)
}

function addGuest() {
  router.push(`${EXTENSION.URL_PREFIX}/guests/new`)
}


// The printing part
const printRef = ref<HTMLElement | null>(null)
const printGuestData = ref<any | null>(null)
let printWindow: Window | null = null

async function printGuest(id: number) {
  // 1. Open popup immediately (allowed by browser)
  printWindow = window.open('', '_blank', 'width=600,height=800')

  if (!printWindow) {
    console.error('Popup blocked')
    return
  }

  // 2. Load guest data
  const entry = await extensionData.getCategoryEntry('guests', id)
  if (!entry) return

  const parsed = GuestUserSchema.parse(JSON.parse(entry.value))

  printGuestData.value = {
    id,
    username: parsed.username,
    password: parsed.password,
    validFrom: new Date(parsed.valid.from),
    validTo: new Date(parsed.valid.to),
    vlan: parsed.assignedVlan ?? null,
    raw: parsed
  }

  // 3. Wait for Vue to render <GuestPrintContent> into printRef
  await nextTick()

  // 4. Extract HTML
  const html = printRef.value?.innerHTML ?? ''

  // 5. Inject into popup
  printWindow.document.open()
  printWindow.document.write(`
    <html>
      <head>
        <title>Guest User</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = function() {
            window.print();
            window.close();
          }
        <\/script>
      <\/body>
    <\/html>
  `)
  printWindow.document.close()
}


</script>
