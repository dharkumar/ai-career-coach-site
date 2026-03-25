# Workflow: Create a New Tele-Component

## Purpose
Create a new voice-renderable UI component that the voice AI agent can display to users.

## Prerequisites
- Understand what data the component will display
- Know the component name (PascalCase, e.g. "WeatherCard", "PricingTable")

## Steps

### 1. Create the component file

**Location**: `src/components/tele-components/{ComponentName}.tsx`

**Template**:
```tsx
'use client';

import { TeleComponentProps } from './types';

/**
 * {ComponentName} — {Brief description}.
 *
 * Props (via data):
 *   {propName}: {type}   — {description}
 */
export default function {ComponentName}({ data, accentColor = '#2563eb', onAction }: TeleComponentProps) {
  // 1. Extract and type-cast props from data
  const title = data.title as string | undefined;

  // 2. Guard against missing data
  if (!title) return null;

  // 3. Render
  return (
    <div className="w-full space-y-3">
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {/* Component content */}
    </div>
  );
}
```

### 2. Register in component-registry.ts

Open `src/components/tele-components/component-registry.ts` and add:

```ts
reg('{ComponentName}', () => import('./{ComponentName}'));
```

Add it under the appropriate category section (Data Viz, Content, Interactive, Layout, Specialized), or under the "Custom client components" section if it's client-specific.

### 3. Verify

- The component should accept `TeleComponentProps` (not custom props)
- All data extraction from `data` object should be type-safe with fallbacks
- Component returns `null` if essential data is missing
- Uses Tailwind CSS only (no external CSS or styled-components)
- Uses `accentColor` prop for theme colors
- Has JSDoc with all props documented

## Checklist
- [ ] File created in `src/components/tele-components/`
- [ ] Exports a default function component
- [ ] Accepts `TeleComponentProps`
- [ ] Registered in `component-registry.ts`
- [ ] JSDoc documents all props
- [ ] Handles missing data gracefully (null guards, default arrays)
- [ ] Uses Tailwind CSS only
- [ ] No additional npm dependencies

## Common Patterns

### Array data with fallback
```tsx
const items: MyItem[] = Array.isArray(data.items) ? data.items : [];
if (items.length === 0) return null;
```

### CTA buttons that talk to the agent
```tsx
<button onClick={() => onAction?.('User clicked: Learn more')}>
  Learn more
</button>
```

### Responsive grid
```tsx
const cols = Math.min(items.length, 3);
<div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
```

### Themed accent color
```tsx
<div style={{ color: accentColor }}>Highlighted text</div>
<div style={{ backgroundColor: accentColor }} className="text-white">Badge</div>
```
