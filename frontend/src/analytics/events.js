// src/analytics/events.js - Frontend analytics stub for Heybo Pet.

export const ANALYTICS_EVENTS = Object.freeze({
  PET_PROFILE_CREATED: 'pet_profile_created',
  PET_PROFILE_UPDATED: 'pet_profile_updated',
  RECIPE_RECOMMENDATION_VIEWED: 'recipe_recommendation_viewed',
  RECIPE_RECOMMENDATION_SELECTED: 'recipe_recommendation_selected',
  STORE_PRODUCT_VIEWED: 'store_product_viewed',
  STORE_ORDER_CREATED: 'store_order_created',
  COOKING_STARTED: 'cooking_started',
  COOKING_COMPLETED: 'cooking_completed',
  FEEDING_RECORDED: 'feeding_recorded',
  FEEDING_FEEDBACK_SUBMITTED: 'feeding_feedback_submitted',
  HEALTH_RECORD_CREATED: 'health_record_created',
  HEALTH_CHANGE_DETECTED: 'health_change_detected',
  DEVICE_FAULT_REPORTED: 'device_fault_reported',
});

const isBrowser = typeof window !== 'undefined';

export function track(eventName, payload = {}) {
  const event = {
    event_name: eventName,
    payload: {
      occurred_at: new Date().toISOString(),
      source: isBrowser ? 'web' : 'unknown',
      ...payload,
    },
  };

  if (import.meta.env.DEV && typeof console !== 'undefined' && console.debug) {
    console.debug('[analytics]', event.event_name, event.payload);
  }

  return event;
}

export function createTracker(defaultPayload = {}) {
  return (eventName, payload = {}) => track(eventName, { ...defaultPayload, ...payload });
}
