/**
 * Event Message Types use Template Literal Type definitions
 */

type EventMessageNamespaces = 'n8n';
type EventMessageGroups = 'ui' | 'core' | 'workflow' | 'nodes';
export type EventMessageEventGroup = `${EventMessageNamespaces}.${EventMessageGroups}`;
export type EventMessageEventName = string;
export type EventMessageLevel = 'info' | 'debug' | 'verbose' | 'error';
export type EventMessageSeverity = 'low' | 'normal' | 'high' | 'highest';
