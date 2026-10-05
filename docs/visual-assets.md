# Website visual assets

Created with the built-in image generation tool. These are illustrative generated photographs, not photographs of the user's equipment. The application serves both locally without external image services.

- Workspace image: `data/images/security-workspace.png` (1536 × 1024). Used in the overview.
- Connected devices image: `data/images/connected-devices.png` (1536 × 1024). Used in device connection guidance and the employee portal.

## Final prompts

### Workspace

Use case: photorealistic-natural. Create a wide landscape editorial photograph for an ivory and olive cybersecurity teaching application. Realistic quiet university security lab desk, graphite laptop showing a subtle olive network diagram with no readable text, small compact server appliance, phone beside laptop, warm ivory desk, soft daylight, restrained olive green accents, beautiful natural materials and soft shadows. No people. Composition: equipment on right two-thirds, calm negative space left, 3:2 landscape. Sophisticated actual product photography, not futuristic. No neon, no hooded hacker, no floating icons, no shield hologram, no logos, no words or watermark.

### Connected devices

Use case: photorealistic-natural. Create a landscape editorial close-up photograph for a private Wi-Fi device connection page. A modern graphite smartphone standing upright next to an open slim silver laptop on a warm ivory desk, subtle olive screen panels without legible text, a small Wi-Fi router softly out of focus behind, daylight from left, natural tactile materials. Equipment centered, 3:2 landscape. Understated high-end product photography, warm paper and forest olive palette. No people, no hands, no neon, no floating icons or diagrams, no logos, no words or watermark.

## Live network behavior

The SVG diagram visualizes actual lab event records, rather than decorative activity. It selects the latest event per source in the last six seconds, excluding seeded fixtures and future timestamps. Active sources are prioritized when the diagram cannot display the entire inventory. Green indicates normal access, amber indicates suspicious activity, and red indicates a request blocked before reaching a service. Telemetry continues toward the local collector and analysis stages. The event feed names the source, activity and destination. Reduced-motion users receive static highlighted paths and the same text information.
