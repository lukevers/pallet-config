import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

const MockIcon = (props: Record<string, unknown>) =>
  React.createElement('span', { 'aria-hidden': 'true', ...props });

vi.mock('lucide-react', () => ({
  Box: MockIcon,
  Layers: MockIcon,
  Plus: MockIcon,
  Truck: MockIcon,
  Weight: MockIcon,
  X: MockIcon,
  RotateCw: MockIcon,
}));
