<template>
  <v-layout height="100%">
    <v-main class="h-screen bg-background">
        <v-container fluid class="pa-5 h-screen overflow-y-auto">
            <v-card elevation="1">
            <!-- title -->
            <v-card-title>
                <slot name="title" />
            </v-card-title>

            <v-card-subtitle>
                <slot name="subtitle" />
            </v-card-subtitle>

            <!-- main content -->
            <v-card-text>
                <slot />
            </v-card-text>

            <!-- footer -->
            <v-card-actions>
                <slot name="footer" />
            </v-card-actions>
            </v-card>
        </v-container>
    </v-main>
  </v-layout>
</template>

<script setup lang="ts">
</script>
