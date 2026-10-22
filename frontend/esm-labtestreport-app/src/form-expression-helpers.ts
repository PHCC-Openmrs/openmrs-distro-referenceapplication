/**
 * Custom helpers for form-engine calculate expressions (e.g. `currentUserName()`).
 *
 * The form engine reads helpers from the shared 'forms-engine-store' global store, so we
 * register into the same store here instead of depending on @openmrs/esm-form-engine-lib.
 */
import { getGlobalStore, getSessionStore } from '@openmrs/esm-framework';

const FORMS_STORE = 'forms-engine-store';

/** Full name of the logged-in user's person (e.g. "Super User"), not the username. */
function currentUserName(): string {
  const user = getSessionStore().getState().session?.user;
  return user?.person?.display ?? '';
}

export function registerFormExpressionHelpers() {
  // Same initial state the form engine uses, in case this runs before the form engine loads.
  const store = getGlobalStore<{ expressionHelpers: Record<string, Function> }>(FORMS_STORE, {
    controls: [],
    postSubmissionActions: [],
    expressionHelpers: {},
    fieldValidators: [],
    fieldValueAdapters: [],
    dataSources: [],
    formSchemaTransformers: [],
  } as any);
  store.getState().expressionHelpers.currentUserName = currentUserName;
}
