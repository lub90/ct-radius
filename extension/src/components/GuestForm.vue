<template>
    <v-form v-model="isValid" @submit.prevent="emitSave">
        <v-container>

            <!-- Username -->
            <v-text-field label="Username" :model-value="guest.username" class="mb-2" :prefix="settings.usernamePrefix"
                :rules="[rules.required, rules.usernameLength]"
                @update:model-value="val => updateField('username', val)" />

            <!-- Password -->
            <v-text-field label="Password" type="text" class="mb-2" :model-value="guest.password"
                :rules="[rules.required, rules.passwordLength, rules.passwordNumber, rules.passwordSpecial]"
                @update:model-value="val => updateField('password', val)" />

            <!-- Password criteria -->
            <v-list density="compact" class="criteria-list mt-n2 mb-4">
                <v-list-item>
                    <template #prepend>
                        <v-icon :class="passwordLengthCheck ? 'text-success' : 'text-error'">
                            {{ passwordLengthCheck ? 'mdi-check-circle' : 'mdi-close-circle' }}
                        </v-icon>
                    </template>
                    At least {{ settings.passwordLength }} characters
                </v-list-item>

                <v-list-item>
                    <template #prepend>
                        <v-icon :class="passwordNumberCheck ? 'text-success' : 'text-error'">
                            {{ passwordNumberCheck ? 'mdi-check-circle' : 'mdi-close-circle' }}
                        </v-icon>
                    </template>
                    Contains at least one number
                </v-list-item>

                <v-list-item>
                    <template #prepend>
                        <v-icon :class="passwordSpecialCheck ? 'text-success' : 'text-error'">
                            {{ passwordSpecialCheck ? 'mdi-check-circle' : 'mdi-close-circle' }}
                        </v-icon>
                    </template>
                    Contains at least one special character ({{ specialCharsDisplay }})
                </v-list-item>
            </v-list>

            <!-- VLAN -->
            <v-select label="Assigned VLAN" :items="vlanItems" item-title="label" item-value="id"
                :model-value="guest.assignedVlan" :rules="[rules.required]"
                @update:model-value="val => updateField('assignedVlan', val)" />

            <!-- Valid From -->
            <v-text-field label="Valid From" type="datetime-local" :model-value="validFromLocal"
                :rules="[rules.required]" @update:model-value="val => updateDate('from', val)" />

            <!-- Valid To -->
            <v-text-field label="Valid To" type="datetime-local" :model-value="validToLocal"
                :rules="[rules.required, rules.validRange]" @update:model-value="val => updateDate('to', val)" />

            <!-- Comment -->
            <v-textarea label="Comment" auto-grow class="mb-4" :model-value="guest.comment"
                @update:model-value="val => updateField('comment', val)" />

            <!-- Buttons -->
            <div class="d-flex justify-end mt-6">
                <v-btn variant="outlined" @click="$emit('cancel')">Cancel</v-btn>
                <v-btn color="primary" class="ml-2" :disabled="!isValid" type="submit">Save</v-btn>
            </div>

        </v-container>
    </v-form>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { SYMBOLS } from "@/../../typescript/src/types/isAllowedString";
import type { GuestUser }  from '@/../../typescript/src/core/modules/ct-guests/GuestUser'
import type { Settings } from '@/types/SettingsSchema'

const props = defineProps<{
    guest: GuestUser;
    settings: Settings;
}>();

const emit = defineEmits<{
    save: [typeof props.guest];
    cancel: [];
    update: [typeof props.guest];
}>();

const isValid = ref(false);

// Special chars
const specialChars = computed(() => props.settings.specialChars ?? SYMBOLS);
const specialCharsDisplay = computed(() => specialChars.value.split("").join(" "));

// Local date strings
const validFromLocal = computed(() => props.guest.valid.from.toISOString().slice(0, 16));
const validToLocal = computed(() => props.guest.valid.to.toISOString().slice(0, 16));

// Update helpers
function updateField(key: string, value: any) {
    emit("update", { ...props.guest, [key]: value });
}

function updateDate(key: "from" | "to", value: string) {
    emit("update", {
        ...props.guest,
        valid: { ...props.guest.valid, [key]: new Date(value) }
    });
}

// Checks
const usernameLengthCheck = computed(() => props.guest.username.length >= props.settings.usernameLength);
const passwordLengthCheck = computed(() => props.guest.password.length >= props.settings.passwordLength);
const passwordNumberCheck = computed(() => /\d/.test(props.guest.password));
const passwordSpecialCheck = computed(() =>
    new RegExp("[" + specialChars.value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "]").test(props.guest.password)
);

// VLAN items
const vlanItems = computed(() =>
    props.settings.allowedVlans.map(v => ({ id: v.id, label: `${v.id} (${v.name})` }))
);

// Rules
const rules = {
    required: (v: any) => !!v || "Required",
    usernameLength: () => usernameLengthCheck.value || `Must be at least ${props.settings.usernameLength} characters`,
    passwordLength: () => passwordLengthCheck.value || `Must be at least ${props.settings.passwordLength} characters`,
    passwordNumber: () => passwordNumberCheck.value || "Must contain at least one number",
    passwordSpecial: () => passwordSpecialCheck.value || `Must contain a special character (${specialChars.value})`,
    validRange: () => props.guest.valid.from < props.guest.valid.to || "Valid To must be after Valid From"
};

// Save
function emitSave() {
    emit("save", props.guest);
}
</script>

<style scoped>
.text-success {
    color: #2e7d32;
}

.text-error {
    color: #c62828;
}

.criteria-list .v-list-item {
    min-height: 24px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
}
</style>
