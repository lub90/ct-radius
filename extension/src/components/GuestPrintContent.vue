<template>
  <div class="print-container">
    <h1>Guest WiFi credentials</h1>

    <div class="row"><span class="label">SSID:</span> {{ ssid }}</div>
    <div class="row"><span class="label">Username:</span> {{ guest.username }}</div>
    <div class="row"><span class="label">Password:</span> {{ guest.password }}</div>
    <div class="row"><span class="label">Valid from:</span> {{ guest.validFrom.toLocaleString() }}</div>
    <div class="row"><span class="label">Valid to:</span> {{ guest.validTo.toLocaleString() }}</div>
    <div class="row"><span class="label">VLAN:</span> {{ guest.vlan ?? '-' }}</div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  guest: {
    username: string
    password: string
    validFrom: Date
    validTo: Date
    vlan: number | null
  },
  ssid: string
}>()
</script>

<style scoped>
.print-container {
  font-family: sans-serif;
  padding: 20px;
}
.row {
  margin-bottom: 10px;
}
.label {
  font-weight: bold;
}
</style>
