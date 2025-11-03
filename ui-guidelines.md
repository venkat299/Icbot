# AI Interview Chatbot - Style Guide

## Overview

This style guide documents the design system, theme, and visual language for the AI Interview Chatbot interface. The design emphasizes a clean, professional aesthetic with a white/gray color scheme, enhanced with glassmorphism, subtle shadows, and embossing effects for a modern 3D appearance.

---

## Color Palette

### Primary Colors

```css
/* Backgrounds */
--background-primary: from-gray-50 to-white (gradient)
--background-card: white/80 (80% opacity with backdrop-blur)
--background-elevated: white/90

/* Text Colors */
--text-primary: #111827 (gray-900)
--text-secondary: #4B5563 (gray-600)
--text-tertiary: #9CA3AF (gray-400)
--text-muted: #6B7280 (gray-500)

/* Accent Colors */
--accent-dark: from-gray-800 to-gray-900 (gradient)
--accent-hover: from-gray-700 to-gray-800 (gradient)
```

### Status Colors

```css
/* Success */
--success-bg: #DCFCE7 (green-100)
--success-text: #15803D (green-700)
--success-border: #BBF7D0 (green-200)

/* Info/Scheduled */
--info-bg: #DBEAFE (blue-100)
--info-text: #1D4ED8 (blue-700)
--info-border: #BFDBFE (blue-200)

/* Warning */
--warning-bg: #FEF3C7 (yellow-100)
--warning-text: #A16207 (yellow-700)
--warning-border: #FDE68A (yellow-200)

/* Error */
--error-bg: #FEE2E2 (red-100)
--error-text: #B91C1C (red-700)
--error-border: #FECACA (red-200)
```

---

## Typography

### Font System

The project uses default system fonts defined in `styles/globals.css`. **Do not override** `font-size`, `font-weight`, or `line-height` with Tailwind classes unless explicitly requested.

### Type Scale

```
h1: Large heading - Used for page titles
h2: Section heading - Used for major sections
h3: Subsection heading - Used for card titles
h4: Small heading - Used for labels and minor sections
p: Body text - Default paragraph style
```

### Usage Guidelines

- **Primary headings**: Use for page titles and main content headers
- **Secondary headings**: Use for section dividers and card headers
- **Body text**: Use `text-gray-900` for primary, `text-gray-600` for secondary
- **Small text**: Use `text-sm` or `text-xs` for metadata and labels
- **Text alignment**: Center on mobile (`text-center sm:text-left`), left-align on desktop

---

## Glassmorphism & 3D Effects

### Primary Card Style

```tsx
className="
  backdrop-blur-xl bg-white/80 border border-gray-200/50
  rounded-2xl sm:rounded-3xl p-6 sm:p-8
  shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
  relative
  before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
  before:bg-gradient-to-br before:from-white/40 before:to-transparent
  before:pointer-events-none
"
```

**Key Elements:**

- `backdrop-blur-xl`: Creates the glass effect
- `bg-white/80`: Semi-transparent white background
- `border-gray-200/50`: Subtle border with 50% opacity
- Triple shadow: Outer glow, subtle drop shadow, inner light reflection
- `before:` pseudo-element for top highlight gradient

### Elevated Card Style

```tsx
className="
  backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
  border border-gray-200/50 rounded-xl p-4
  shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
"
```

**Usage:** Nested cards, smaller components, secondary information

---

## Shadow System

### Shadow Hierarchy

```css
/* Level 1 - Subtle */
shadow-[0_2px_8px_rgba(0,0,0,0.06)]

/* Level 2 - Standard */
shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]

/* Level 3 - Elevated */
shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]

/* Level 4 - Floating (Buttons) */
shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
```

### Embossing Effect

Achieved through inset shadows: `inset_0_1px_0_rgba(255,255,255,0.9)`

This creates a subtle highlight on the top edge of elements, simulating a raised surface.

---

## Component Patterns

### Buttons

#### Primary Button

```tsx
<Button
  className="
    bg-gradient-to-br from-gray-800 to-gray-900 
    hover:from-gray-700 hover:to-gray-800
    text-white 
    shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
  "
>
  Button Text
</Button>
```

#### Secondary Button (Outline)

```tsx
<Button
  variant="outline"
  className="
    bg-white/80 border-gray-300/50 text-gray-700
    hover:bg-gray-50 hover:border-gray-400/50
    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
  "
>
  Button Text
</Button>
```

#### Ghost Button

```tsx
<Button
  variant="ghost"
  className="
    text-gray-600 
    hover:text-gray-900 
    hover:bg-gray-100
  "
>
  Button Text
</Button>
```

### Badges

```tsx
{
  /* Status Badge - Completed */
}
<Badge className="bg-green-100 text-green-700 border-green-200">
  Completed
</Badge>;

{
  /* Status Badge - Scheduled */
}
<Badge className="bg-blue-100 text-blue-700 border-blue-200">Scheduled</Badge>;

{
  /* Outline Badge */
}
<Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
  Label
</Badge>;
```

### Cards

```tsx
<Card
  className="
  backdrop-blur-xl bg-white/80 border border-gray-200/50
  rounded-2xl sm:rounded-3xl p-4 sm:p-6
  shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
  relative
  before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
  before:bg-gradient-to-br before:from-white/40 before:to-transparent
  before:pointer-events-none
"
>
  <div className="relative z-10">{/* Card content goes here */}</div>
</Card>
```

**Important:** Always wrap card content in a `relative z-10` div to ensure content appears above the `before:` gradient overlay.

### Input Fields

```tsx
<div className="space-y-2">
  <Label className="text-sm text-gray-700">Label Text</Label>
  <Input
    className="
      bg-white/90 border-gray-300/50
      focus:border-gray-400 focus:ring-gray-400/20
      shadow-[0_2px_8px_rgba(0,0,0,0.04)]
    "
    placeholder="Placeholder text"
  />
</div>
```

### Textareas

```tsx
<Textarea
  className="
    bg-white/90 border-gray-300/50
    focus:border-gray-400 focus:ring-gray-400/20
    shadow-[0_2px_8px_rgba(0,0,0,0.04)]
    min-h-[200px]
  "
  placeholder="Enter text..."
/>
```

### Select Dropdowns

```tsx
<Select>
  <SelectTrigger
    className="
    bg-white/90 border-gray-300/50
    focus:border-gray-400 focus:ring-gray-400/20
    shadow-[0_2px_8px_rgba(0,0,0,0.04)]
  "
  >
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
  </SelectContent>
</Select>
```

---

## Layout & Spacing

### Container Widths

```tsx
{/* Full screen containers */}
<div className="h-screen w-screen overflow-auto">

{/* Centered content containers */}
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">

{/* Narrow content (forms, setup) */}
<div className="max-w-4xl mx-auto">
```

### Spacing Scale

```
gap-2    → 0.5rem (8px)  - Tight spacing
gap-3    → 0.75rem (12px) - Standard spacing
gap-4    → 1rem (16px)    - Default spacing
gap-6    → 1.5rem (24px)  - Comfortable spacing
gap-8    → 2rem (32px)    - Section spacing
gap-12   → 3rem (48px)    - Large section spacing
```

### Responsive Spacing Pattern

Use the pattern: `[mobile] sm:[tablet] lg:[desktop]`

```tsx
className = "px-4 sm:px-6 lg:px-8"; // Horizontal padding
className = "py-6 sm:py-8 lg:py-12"; // Vertical padding
className = "gap-4 sm:gap-6"; // Gap between items
className = "space-y-4 sm:space-y-6"; // Vertical spacing
```

---

## Responsive Design

### Breakpoints

```css
sm: 640px   /* Tablets and up */
md: 768px   /* Medium tablets */
lg: 1024px  /* Laptops and up */
xl: 1280px  /* Large desktops */
2xl: 1536px /* Extra large screens */
```

### Mobile-First Approach

Always design for mobile first, then enhance for larger screens:

```tsx
{/* Mobile: stack vertically, Desktop: horizontal */}
<div className="flex flex-col sm:flex-row gap-4">

{/* Mobile: full width, Desktop: half width */}
<div className="w-full sm:w-1/2">

{/* Mobile: center text, Desktop: left align */}
<p className="text-center sm:text-left">

{/* Mobile: hide, Desktop: show */}
<div className="hidden sm:block">

{/* Mobile: show, Desktop: hide */}
<div className="block sm:hidden">
```

### Common Responsive Patterns

#### Heading with Action Button

```tsx
<div className="flex items-center justify-between mb-2">
  <div className="flex items-center gap-3 flex-1 justify-center sm:justify-start">
    <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
    <h1>Page Title</h1>
  </div>
  <Button className="hidden sm:flex">Action</Button>
</div>;
{
  /* Mobile button below */
}
<div className="sm:hidden mt-4 flex justify-center">
  <Button size="sm">Action</Button>
</div>;
```

#### Grid Layouts

```tsx
{/* 1 column mobile, 2 columns tablet, 3 columns desktop */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

---

## Animation & Motion

### Animation Library

Uses `motion/react` (formerly Framer Motion)

```tsx
import { motion } from "motion/react";
```

### Standard Animations

#### Fade In + Slide Up

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>
```

#### Fade In + Slide Down

```tsx
<motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
  Content
</motion.div>
```

#### Staggered List Animation

```tsx
{
  items.map((item, index) => (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      {item.content}
    </motion.div>
  ));
}
```

#### Scale on Hover

```tsx
<motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
  Button
</motion.button>
```

---

## Icons

### Icon Library

Uses `lucide-react` for all icons.

```tsx
import { Calendar, FileText, User, Award } from "lucide-react";
```

### Icon Sizing

```tsx
{
  /* Small icons (inline with text) */
}
<Icon className="w-3.5 h-3.5" />;

{
  /* Standard icons */
}
<Icon className="w-4 h-4" />;

{
  /* Medium icons */
}
<Icon className="w-5 h-5" />;

{
  /* Large icons (headings) */
}
<Icon className="w-6 h-6 sm:w-8 sm:h-8" />;

{
  /* Extra large icons (empty states) */
}
<Icon className="w-12 h-12" />;
```

### Icon Colors

```tsx
{
  /* Primary */
}
<Icon className="text-gray-600" />;

{
  /* Secondary */
}
<Icon className="text-gray-400" />;

{
  /* On hover */
}
<Icon className="text-gray-600 hover:text-gray-900" />;
```

---

## Dialog & Modal Patterns

### Standard Dialog

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button variant="outline">Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Optional description text</DialogDescription>
    </DialogHeader>
    <div className="space-y-4">{/* Dialog content */}</div>
  </DialogContent>
</Dialog>
```

### Scrollable Dialog

```tsx
<DialogContent className="max-w-3xl max-h-[80vh]">
  <DialogHeader>
    <DialogTitle>Long Content</DialogTitle>
  </DialogHeader>
  <ScrollArea className="h-[500px] pr-4">
    <div className="space-y-4">{/* Scrollable content */}</div>
  </ScrollArea>
</DialogContent>
```

**Important:** When using `DialogTrigger` with `asChild`, do NOT add `onClick` handlers to the child button. The DialogTrigger handles the click event automatically.

---

## Best Practices

### Do's ✅

- **Use backdrop-blur** for glassmorphism effects on all cards
- **Layer shadows** using multiple shadow values for depth
- **Add inset highlights** (`inset_0_1px_0`) for embossed effects
- **Use opacity** on backgrounds (`/80`, `/90`) for subtle transparency
- **Wrap card content** in `relative z-10` divs when using `before:` gradients
- **Design mobile-first** then enhance for larger screens
- **Use semantic HTML** and proper heading hierarchy
- **Maintain consistent spacing** using the spacing scale
- **Animate state changes** for smooth transitions

### Don'ts ❌

- **Don't override typography** classes unless requested
- **Don't use hard borders** without opacity (`border-gray-200/50` not `border-gray-200`)
- **Don't mix shadow styles** - keep shadows consistent within component types
- **Don't use `onClick` on DialogTrigger children** - causes ref forwarding issues
- **Don't create solid backgrounds** - prefer semi-transparent with blur
- **Don't forget responsive variants** - test on all screen sizes
- **Don't use arbitrary colors** - stick to the gray scale palette
- **Don't skip animations** on dynamic content

---

## Accessibility

### Color Contrast

All text colors maintain WCAG AA standards:

- `text-gray-900` on white backgrounds: 16.7:1
- `text-gray-600` on white backgrounds: 7.1:1
- `text-gray-500` on white backgrounds: 4.6:1

### Interactive Elements

- All buttons have hover states
- Focus states use `focus:ring` and `focus:border`
- Icon buttons include `title` attributes
- Dialogs have proper ARIA labels via `DialogTitle` and `DialogDescription`

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Dialogs can be closed with Escape key
- Tab order follows visual hierarchy

---

## File Structure

### Component Organization

```
/components
  /ui                    # Shadcn UI components (do not modify)
    button.tsx
    card.tsx
    dialog.tsx
    ...
  Chatbot.tsx           # Main chatbot interface
  SetupPage.tsx         # Interview setup form
  ScheduledInterviews.tsx  # Interviews list
  InterviewerSidebar.tsx   # Scoring sidebar
  QuestionComponent.tsx    # Interactive question types
  ...

/styles
  globals.css           # Global styles and typography

App.tsx                 # Main application and routing
```

### Styling Approach

- **Use Tailwind classes** for all styling
- **No custom CSS** unless absolutely necessary
- **Leverage Shadcn components** from `/components/ui`
- **Do not modify** protected system files like `ImageWithFallback.tsx`

---

## Version & Updates

**Last Updated:** November 1, 2025  
**Design System Version:** 1.0  
**Tailwind Version:** 4.0

---

## Quick Reference

### Color Classes

```css
bg-white/80             /* Semi-transparent white */
text-gray-900           /* Primary text */
text-gray-600           /* Secondary text */
border-gray-200/50      /* Subtle border */
from-gray-800 to-gray-900  /* Dark gradient */
```

### Shadow Classes

```css
shadow-[0_2px_8px_rgba(0,0,0,0.06)]  /* Light */
shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]  /* Standard */
shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]  /* Elevated */
```

### Common Patterns

```css
backdrop-blur-xl bg-white/80  /* Glass effect */
rounded-2xl sm:rounded-3xl    /* Responsive radius */
px-4 sm:px-6 lg:px-8         /* Responsive padding */
hidden sm:block              /* Show on desktop only */
```

---

## Support & Questions

For questions about the style guide or to propose changes, please create an issue in the repository.
