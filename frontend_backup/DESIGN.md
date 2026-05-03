---
name: DecisionOS
colors:
  surface: '#0e1416'
  surface-dim: '#0e1416'
  surface-bright: '#343a3c'
  surface-container-lowest: '#090f11'
  surface-container-low: '#161d1e'
  surface-container: '#1a2122'
  surface-container-high: '#242b2d'
  surface-container-highest: '#2f3638'
  on-surface: '#dde4e5'
  on-surface-variant: '#bbc9cd'
  inverse-surface: '#dde4e5'
  inverse-on-surface: '#2b3233'
  outline: '#859397'
  outline-variant: '#3c494c'
  surface-tint: '#2fd9f4'
  primary: '#8aebff'
  on-primary: '#00363e'
  primary-container: '#22d3ee'
  on-primary-container: '#005763'
  inverse-primary: '#006877'
  secondary: '#cebdff'
  on-secondary: '#381385'
  secondary-container: '#4f319c'
  on-secondary-container: '#bea8ff'
  tertiary: '#ffd6a3'
  on-tertiary: '#462b00'
  tertiary-container: '#ffb13b'
  on-tertiary-container: '#6e4600'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#a2eeff'
  primary-fixed-dim: '#2fd9f4'
  on-primary-fixed: '#001f25'
  on-primary-fixed-variant: '#004e5a'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cebdff'
  on-secondary-fixed: '#21005e'
  on-secondary-fixed-variant: '#4f319c'
  tertiary-fixed: '#ffddb5'
  tertiary-fixed-dim: '#ffb957'
  on-tertiary-fixed: '#2a1800'
  on-tertiary-fixed-variant: '#643f00'
  background: '#0e1416'
  on-background: '#dde4e5'
  surface-variant: '#2f3638'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h1:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
  h2:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  h3:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '500'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '500'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  xxl: 64px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is engineered to project an atmosphere of advanced intelligence and clinical precision. The brand personality is authoritative yet visionary, positioning the product as a mission-critical tool for high-stakes AI research. 

The aesthetic is a sophisticated fusion of **Minimalism** and **Glassmorphism**. By stripping away unnecessary ornamentation and focusing on atmospheric depth, the interface emphasizes the data itself. The use of translucent layers and subtle luminescence evokes a sense of "looking into the machine," providing a futuristic, high-fidelity experience that feels both premium and technically rigorous.

## Colors

The color architecture is rooted in deep, nocturnal tones to reduce eye strain during prolonged research sessions. The primary canvas uses **Midnight Navy** for deep background space, while **Deep Indigo** defines the structural surfaces.

Accents are used with extreme intentionality. **Neon Cyan** is reserved for primary actions, active states, and critical data insights, acting as a beacon within the dark interface. **Soft Violet** provides secondary highlights and categorizes auxiliary data streams. Functional neutrals are derived from the indigo base, ensuring that even low-priority text remains harmonious with the atmospheric theme.

## Typography

The typographic system utilizes a dual-font approach to balance futuristic character with professional readability. **Space Grotesk** is used for headlines and technical data points, lending a cutting-edge, geometric aesthetic to the research environment. **Inter** serves as the primary workhorse for body copy and administrative UI, ensuring maximum clarity for dense information.

Large data metrics should use the `display-lg` or `data-mono` styles to stand out as primary artifacts of the research. High contrast between text and background is strictly maintained, with primary data points often utilizing the Neon Cyan accent for immediate recognition.

## Layout & Spacing

The layout follows a **fluid grid** model designed for high-density data visualization. A 12-column system is utilized for desktop, transitioning to a single-column stack for mobile devices. 

Spacing is governed by a 4px base unit to ensure mathematical harmony across all components. Generous whitespace (using the `xl` and `xxl` tokens) is intentionally placed between major research modules to prevent cognitive overload, while tight internal padding (using `sm` and `md`) keeps related data points logically grouped within their respective glass containers.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and tonal layering rather than traditional heavy shadows. Surfaces are defined by three distinct layers:

1.  **The Void (Base):** The Midnight Navy background layer.
2.  **The Glass (Modules):** Semi-transparent Deep Indigo surfaces with a 12px backdrop-blur and a 1px "inner glow" border (`rgba(255, 255, 255, 0.1)`).
3.  **The Focus (Modals/Active):** Higher opacity glass with a subtle outer bloom using a desaturated Cyan shadow to indicate interaction.

This approach creates a sense of physical depth, where information appears to float in a structured, holographic space.

## Shapes

The design system employs a **Rounded** shape language to soften the technical nature of the product, making it feel more approachable and modern. 

- Standard components (Buttons, Inputs) use the **0.5rem (8px)** corner radius.
- Larger containers and cards utilize the **1rem (16px)** radius for a distinct, framed appearance.
- This consistent rounding creates a "capsule" aesthetic that echoes the soft violet and neon cyan accents, ensuring the interface feels like a cohesive, engineered instrument.

## Components

### Buttons
Primary buttons utilize a solid Neon Cyan fill with dark navy text for maximum contrast. Secondary buttons use a "ghost" style with a Soft Violet border and a subtle backdrop blur. Interaction states should include a slight glow effect (box-shadow bloom).

### Cards
All content modules are housed in glassmorphism cards. These cards must feature a `backdrop-filter: blur(12px)` and a top-weighted linear gradient border to simulate a light source hitting the edge of the glass.

### Data Visualizations
Charts should utilize the accent palette exclusively. Lines and bars should have a subtle outer glow to match the futuristic aesthetic. Grid lines within charts must be minimal, using low-opacity indigo.

### Form Inputs
Inputs are dark-themed with a Deep Indigo background and a 1px border that shifts to Neon Cyan upon focus. Use `Space Grotesk` for input labels to maintain the technical feel.

### Status Indicators
Use small, glowing "pills" for status indicators. AI processing states should utilize an animated Soft Violet pulse, while completed research tasks use a steady Neon Cyan glow.