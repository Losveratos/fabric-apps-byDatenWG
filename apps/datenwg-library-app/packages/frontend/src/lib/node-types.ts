import type { NodeType } from './library';

export const TYPE_LABEL: Record<NodeType, string> = {
  Document: 'Dokument',
  Topic: 'Thema',
  Tool: 'Tool',
  Person: 'Person',
  Organization: 'Organisation',
  Bucket: 'Bereich',
};

/** Tailwind background class per node type (tokens from global.css). */
export const TYPE_BG: Record<NodeType, string> = {
  Document: 'bg-node-doc text-node-doc-foreground',
  Topic: 'bg-node-topic text-node-topic-foreground',
  Tool: 'bg-node-tool text-node-tool-foreground',
  Person: 'bg-node-person text-node-person-foreground',
  Organization: 'bg-node-org text-node-org-foreground',
  Bucket: 'bg-node-bucket text-node-bucket-foreground',
};

/** CSS variable reference per node type, for SVG fills. */
export const TYPE_VAR: Record<NodeType, string> = {
  Document: 'var(--color-node-doc)',
  Topic: 'var(--color-node-topic)',
  Tool: 'var(--color-node-tool)',
  Person: 'var(--color-node-person)',
  Organization: 'var(--color-node-org)',
  Bucket: 'var(--color-node-bucket)',
};
