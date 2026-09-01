import type { Metadata } from 'next';
import { ApiReferenceClient } from './api-reference-client';

export const metadata: Metadata = {
  title: 'API Reference - ROYCSS Documentation',
  description: 'Complete API reference for all ROYCSS effects, components, and utilities.',
};

export default function ApiReferencePage() {
  return <ApiReferenceClient />;
}
