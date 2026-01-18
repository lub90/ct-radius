<template>
    <v-form v-model="isValid" @submit.prevent="emitSave">
        <v-container>

            <!-- Username -->
            <v-text-field label="Username" :model-value="username" class="mb-2"
                @update:model-value="val => emitUpdate('username', val)" :rules="[rules.required, rules.usernameLength]"
                prepend-inner-icon="" :prefix="usernamePrefix" />

            <!-- Password -->
            <v-text-field label="Password" :model-value="password"
                @update:model-value="val => emitUpdate('password', val)" type="text" class="mb-2"
                :rules="[rules.required, rules.passwordLength, rules.passwordNumber, rules.passwordSpecial]" />

            <!-- Password checks -->
            <v-list density="compact" class="criteria-list mt-n2 mb-4">

                <!-- Minimum length -->
                <v-list-item>
                    <template #prepend>
                        <v-icon :class="passwordLengthCheck ? 'text-success' : 'text-error'">
                            {{ passwordLengthCheck ? 'mdi-check-circle' : 'mdi-close-circle' }}
                        </v-icon>
                    </template>
                    At least {{ minPasswordLength }} characters
                </v-list-item>

                <!-- Contains number -->
                <v-list-item>
                    <template #prepend>
                        <v-icon :class="passwordNumberCheck ? 'text-success' : 'text-error'">
                            {{ passwordNumberCheck ? 'mdi-check-circle' : 'mdi-close-circle' }}
                        </v-icon>
                    </template>
                    Contains at least one number
                </v-list-item>

                <!-- Contains special character -->
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
            <v-select label="Assigned VLAN" :items="vlanItems" item-title="label" item-value="id" :model-value="vlan"
                @update:model-value="val => emitUpdate('vlan', val)" :rules="[rules.required]" />

            <!-- Valid From -->
            <v-text-field label="Valid From" type="datetime-local" :model-value="validFromLocal"
                @update:model-value="val => updateDate('validFrom', val)" :rules="[rules.required]" />

            <!-- Valid To -->
            <v-text-field label="Valid To" type="datetime-local" :model-value="validToLocal"
                @update:model-value="val => updateDate('validTo', val)" :rules="[rules.required, rules.validRange]" />

            <!-- Buttons -->
            <div class="d-flex justify-end mt-6">
                <v-btn variant="outlined" @click="$emit('cancel')">
                    Cancel
                </v-btn>

                <v-btn color="primary" class="ml-2" :disabled="!isValid" type="submit">
                    Save
                </v-btn>
            </div>

        </v-container>
    </v-form>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { SYMBOLS } from '@/../../typescript/src/types/isAllowedString';

const props = defineProps<{
    username: string;
    minUsernameLength: number;
    usernamePrefix: string;
    password: string;
    minPasswordLength: number;
    specialChars?: string;
    vlan: number | null;
    allowedVlans: { id: number; name: string }[];
    validFrom: Date;
    validTo: Date;
}>();

const emit = defineEmits<{
    save: [
        {
            username: string;
            password: string;
            vlan: number | null;
            validFrom: Date;
            validTo: Date;
        }
    ];
    cancel: [];
    update: [key: string, value: any];
}>();

// Form validity
const isValid = ref(false);

// Special chars fallback
const specialChars = computed(() => props.specialChars ?? SYMBOLS);

// Display version
const specialCharsDisplay = computed(() => specialChars.value.split("").join(" "));

// Convert dates to local datetime strings
const validFromLocal = computed(() =>
    props.validFrom.toISOString().slice(0, 16)
);
const validToLocal = computed(() =>
    props.validTo.toISOString().slice(0, 16)
);

// Emit updates to parent
function emitUpdate(key: string, value: any) {
    emit("update", key, value);
}

// Update date fields
function updateDate(key: "validFrom" | "validTo", val: string) {
    emit("update", key, new Date(val));
}

// Password checks
const passwordLengthCheck = computed(
    () => props.password.length >= props.minPasswordLength
);
const passwordNumberCheck = computed(
    () => /\d/.test(props.password)
);
const passwordSpecialCheck = computed(
    () => new RegExp("[" + specialChars.value.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&") + "]").test(props.password)
);

// Username checks
const usernameLengthCheck = computed(
    () => props.username.length >= props.minUsernameLength
);

// VLAN dropdown items
const vlanItems = computed(() =>
    props.allowedVlans.map(v => ({
        id: v.id,
        label: `${v.id} (${v.name})`
    }))
);

// Validation rules
const rules = {
    required: (v: any) => !!v || "Required",
    usernameLength: () =>
        usernameLengthCheck.value || `Must be at least ${props.minUsernameLength} characters`,
    passwordLength: () =>
        passwordLengthCheck.value || `Must be at least ${props.minPasswordLength} characters`,
    passwordNumber: () =>
        passwordNumberCheck.value || "Must contain at least one number",
    passwordSpecial: () =>
        passwordSpecialCheck.value || `Must contain a special character (${specialChars.value})`,
    validRange: () =>
        props.validFrom < props.validTo || "Valid To must be after Valid From"
};

// Emit save
function emitSave() {
    emit("save", {
        username: props.username,
        password: props.password,
        vlan: props.vlan,
        validFrom: props.validFrom,
        validTo: props.validTo
    });
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
