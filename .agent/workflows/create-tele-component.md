# Workflow: Create a New Card Component

## Purpose
Create a new card component for the DSL-driven scene system. Cards are rendered inside `GridView` layouts that the voice AI agent generates via pipe-delimited DSL.

## Architecture Overview

The scene system works as follows:
1. The AI agent (one-brain or two-brain mode) generates **pipe-delimited DSL** text
2. `parseDSL.ts` parses the DSL into `CardDef[]` objects
3. `GridView.tsx` maps each `CardDef.type` to a React component via `CARD_MAP`
4. The card receives its props as flat top-level fields on `CardDef`

There are **no tele-components or component registries** — cards are simple named exports, statically imported and mapped in `GridView.tsx`.

## Prerequisites
- Know the card name (PascalCase for file/export, kebab-case for DSL type)
- Know what data fields the card will display
- Decide if it's a **flat card** (single line of pipe-delimited fields) or a **container card** (header line + child item lines)

## Steps

### 1. Create the component file

**Location**: `src/components/cards/{ComponentName}.tsx`

**Key conventions** (match existing cards exactly):
- Use CSS custom properties for theming: `var(--theme-chart-line)` for accent color
- Use `color-mix()` helper for opacity: `color-mix(in srgb, var(--theme-chart-line) 80%, transparent)`
- Use `font-data` class for data/labels, `font-voice` for body text
- Export as both named and default export
- Define a typed props interface (NOT a generic `data` bag)

**Template for a flat card:**
```tsx
import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface MyCardProps {
    label: string;
    value: string;
    detail?: string;
}

export const MyCard: React.FC<MyCardProps> = ({ label, value, detail }) => (
    <div className="flex flex-col h-full justify-start gap-1.5">
        <h3 className="font-data text-base font-bold" style={{ color: getColor(90) }}>{label}</h3>
        <p className="font-data text-2xl font-bold" style={{ color: C }}>{value}</p>
        {detail && (
            <p className="font-voice text-sm leading-relaxed" style={{ color: getColor(70) }}>{detail}</p>
        )}
    </div>
);

export default MyCard;
```

**Template for a container card** (with child items):
```tsx
import React from 'react';

const C = 'var(--theme-chart-line)';
const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface MyListItem {
    name: string;
    value: string;
}

interface MyListCardProps {
    title?: string;
    items: MyListItem[];
}

export const MyListCard: React.FC<MyListCardProps> = ({ title, items }) => (
    <div className="flex flex-col h-full gap-2">
        {title && <h3 className="font-data text-base font-bold" style={{ color: getColor(90) }}>{title}</h3>}
        <div className="flex flex-col gap-1">
            {items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1"
                     style={{ borderBottom: `1px solid ${getColor(8)}` }}>
                    <span className="font-voice text-sm" style={{ color: getColor(80) }}>{item.name}</span>
                    <span className="font-data text-sm font-semibold" style={{ color: C }}>{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default MyListCard;
```

### 2. Register in index.ts

Open `src/components/cards/index.ts` and add a named export:

```ts
export { MyCard } from './MyCard';
```

Add it under the appropriate category section.

### 3. Register in GridView.tsx

Open `src/components/cards/GridView.tsx` and make **three changes**:

**a) Add the import** (at the top, in the appropriate category group):
```ts
import { ..., MyCard } from '@/components/cards';
```

**b) Add to `CARD_MAP`** (maps the DSL type string → component):
```ts
'my-card': MyCard,
```

**c) Add to `CARD_SIZE`** (determines row height weight):
```ts
// Size tiers:
//   1 = compact (strip-like, no vertical space needed)
//   2 = standard (stats, lists, moderate content)
//   3 = expansive (charts, tables, maps)
'my-card': 2,
```

### 4. Add DSL parsing support in parseDSL.ts

Open `src/utils/parseDSL.ts` and make these changes:

**a) Add to `DSL_SCHEMA`** (defines pipe count and field names):

For a **flat card** (all fields on one line):
```ts
'my-card': { pipeCount: 3, fields: ['label','value','detail'] },
```

For a **container card** (header + item lines):
```ts
'my-list': { pipeCount: 1, fields: ['title'] },
```

**b) Add parser case in `parseLine()`**:

For a **flat card**, add a case in the flat-card section:
```ts
case 'my-card': {
    const [label, value, detail] = rest;
    cards.push({ type: 'my-card', label: n(label)!, value: n(value)!, detail: n(detail) });
    break;
}
```

For a **container card**, add:
- A header case that sets `currentContainer`:
```ts
case 'my-list': {
    const [title] = rest;
    currentContainer = { type: 'my-list', title: n(title), items: [] };
    cards.push(currentContainer);
    break;
}
```
- An item prefix case (e.g., `myitem`) in the item-prefix section:
```ts
case 'myitem': {
    const [name, value] = rest;
    if (currentContainer?.type === 'my-list') {
        currentContainer.items.push({ name: n(name)!, value: n(value)! });
    }
    break;
}
```

### 5. Verify

Run `npm run build` to confirm no TypeScript errors.

## Checklist
- [ ] File created in `src/components/cards/`
- [ ] Named + default export
- [ ] Typed props interface (not generic `data` object)
- [ ] Uses CSS custom properties for theme (`var(--theme-chart-line)`, `color-mix()`)
- [ ] Uses `font-data` / `font-voice` font classes
- [ ] Added to `src/components/cards/index.ts`
- [ ] Added to `CARD_MAP` in `GridView.tsx`
- [ ] Added to `CARD_SIZE` in `GridView.tsx`
- [ ] Added to `DSL_SCHEMA` in `parseDSL.ts`
- [ ] Parser case added in `parseLine()` in `parseDSL.ts`
- [ ] No additional npm dependencies
- [ ] `npm run build` passes

## DSL Format Reference

The DSL uses pipe-delimited lines wrapped in sentinels:

```
===CARDS===
LAYOUT|2x3
BADGE|Dashboard Title
stat|Revenue|$4.2M|↑12%|green|Q1 2026|+$450K
kpi-strip
  kpi|Users|12,450|↑8%
  kpi|Revenue|$1.2M|↑15%
info-card|chart|Performance|System running at peak efficiency|View Details
===END===
```

**Rules:**
- First field is always the card type (kebab-case)
- Remaining fields are pipe-separated, positional (order matters)
- Container cards have indented child lines prefixed with item type
- Use `—` or `-` for empty/placeholder fields
- `LAYOUT|{code}` sets the grid layout (e.g., `2x3`, `1-2`, `3x2`)
- `BADGE|{text}` sets the scene title badge

## Common Patterns

### Icons (SVG path-based)
Cards that support icons use a string key mapped to `ICON_PATHS` in the component.
Available: factory, car, battery, robot, chart, globe, shield, brain, bolt, fire, gear, people, money, rocket, sun.

### Responsive sizing
GridView handles all layout. Cards should use `h-full` and flex to fill their cell.

### Theme colors
```tsx
const C = 'var(--theme-chart-line)';                    // solid accent
const getColor = (opacity: number) =>
    `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;
// Usage:
// getColor(90) — near-opaque text
// getColor(50) — mid-opacity
// getColor(10) — subtle background
// getColor(5)  — very faint bg
```
