# Filament Quoter — Design Spec
_Date: 2026-05-25_

## Context

The owner of a 3D printing business needs a way for customers to self-serve a price quote before committing to a job. Without this, quoting requires back-and-forth email, which slows down order intake. The goal is a tool embedded in their Squarespace site where a customer uploads a model file, selects a filament, sees a full cost breakdown, and — if they accept — submits the job directly via a Squarespace form. The owner gets notified by Squarespace, prints the job, and invoices through their existing Squarespace Commerce setup.

---

## Architecture

**Repository: `filament-quoter` (GitHub, public)**

```
filament-quoter/
├── src/
│   ├── main.js          # Mounts wizard into <div id="filament-quoter">
│   ├── parser.js        # STL + 3MF → volume in cm³
│   ├── calculator.js    # Quote math
│   └── ui.js            # Card wizard rendering
├── public/
│   └── config.json      # Filament catalog + pricing (owner-editable)
├── dist/                # Vite build output → GitHub Pages
└── vite.config.js
```

**GitHub Pages** (deployed via GitHub Actions on push to `main`) serves:
- `quoter.js` — bundled app loaded by Squarespace
- `config.json` — runtime pricing config fetched on page load

**Squarespace page** has two blocks:
1. **Code Block** — loads the wizard
2. **Form Block** — native Squarespace form, revealed on quote acceptance

**Deployment cycle:** edit code or config locally → push to `main` → Actions builds with Vite → live on GitHub Pages in ~60 seconds. The Squarespace `<script src>` tag never needs to change.

---

## UI: Card-Based Wizard

A fixed-height card widget. Progress indicator (`Step N of 4`) at the top. Next/Back navigation. Mounted into `<div id="filament-quoter">` by `main.js`.

**Error state:** If `config.json` fails to load (network error, CORS issue), the wizard card shows: *"Unable to load pricing data. Please refresh the page or contact us directly."* No steps are shown until config loads successfully.

### Step 1 — Upload File
- Drag-and-drop zone + click-to-browse
- Accepts `.stl` and `.3mf`
- Shows filename and parsed volume (cm³) after successful parse
- Error state if file is invalid or unsupported format

### Step 2 — Select Filament
- Filament options rendered from `config.json` (pill/chip selector)
- Each option shows name + one-line description
- Supports: PLA, PETG, ABS, ASA, Nylon, PC

### Step 3 — Review Quote
- Line-item breakdown:
  - Material (`Xg @ $Y/g`) → `$Z`
  - Machine time (`X.Xh @ $Y/hr`) → `$Z`
  - Labor / setup → `$Z`
  - Markup (`X%`) → `$Z`
  - **Total** → `$Z`
- If computed total < `minimum_order_total`, shows "Minimum order of $19.00 applied" and displays $19.00
- Two buttons: **Accept Quote** / **Decline**
- Decline returns to Step 1

### Step 4 — Submit Job
- Triggered by "Accept Quote"
- Banner: *"Your quote has been saved. Complete the form below to submit your job."*
- Page scrolls to the Squarespace Form Block, which becomes visible
- Hidden form fields are pre-filled: filament type, volume, quote breakdown (text summary), final total
- Customer fills in: Name, Email, optional Notes
- Customer re-uploads their STL/3MF file (required — Squarespace handles file storage independently)
- UI note: *"Please re-upload your file below so we have it on record."*

---

## Quote Calculation (`calculator.js`)

```
weight_g       = volume_cm3 × density_g_per_cm3 × (1 + waste_factor)
material_cost  = weight_g × cost_per_gram

print_hours    = volume_cm3 / print_speed_cm3_per_hr
machine_cost   = print_hours × machine_hourly_rate

subtotal       = material_cost + machine_cost + labor_fee
computed_total = subtotal × (1 + markup_percent / 100)

final_total    = Math.max(computed_total, minimum_order_total)
```

All inputs come from `config.json`. No hardcoded numbers in code.

---

## File Parsing (`parser.js`)

**STL (binary and ASCII):**
- Detect format by checking for `solid` ASCII header vs. binary byte count
- Parse triangles, compute signed volume using the divergence theorem
- Result in cm³

**3MF:**
- 3MF is a ZIP archive containing `3D/3dmodel.model` (XML)
- Unzip in-browser using **JSZip** (loaded from jsDelivr CDN)
- Parse mesh vertices/triangles from XML
- Same volume computation as STL

---

## `config.json` Schema

```json
{
  "pricing": {
    "machine_hourly_rate": 2.50,
    "labor_fee": 15.00,
    "markup_percent": 30,
    "waste_factor": 0.15,
    "minimum_order_total": 19.00
  },
  "filaments": [
    {
      "id": "pla",
      "name": "PLA",
      "density_g_per_cm3": 1.24,
      "cost_per_gram": 0.02,
      "print_speed_cm3_per_hr": 10.0,
      "description": "Great for general-purpose prints. Rigid, easy to post-process."
    },
    {
      "id": "petg",
      "name": "PETG",
      "density_g_per_cm3": 1.27,
      "cost_per_gram": 0.03,
      "print_speed_cm3_per_hr": 8.5,
      "description": "Tough and slightly flexible. Good chemical resistance."
    },
    {
      "id": "abs",
      "name": "ABS",
      "density_g_per_cm3": 1.05,
      "cost_per_gram": 0.025,
      "print_speed_cm3_per_hr": 7.5,
      "description": "Heat-resistant, machinable. Requires enclosure."
    },
    {
      "id": "asa",
      "name": "ASA",
      "density_g_per_cm3": 1.07,
      "cost_per_gram": 0.04,
      "print_speed_cm3_per_hr": 7.0,
      "description": "UV and weather resistant. Ideal for outdoor parts."
    },
    {
      "id": "nylon",
      "name": "Nylon",
      "density_g_per_cm3": 1.10,
      "cost_per_gram": 0.06,
      "print_speed_cm3_per_hr": 6.0,
      "description": "High strength and flexibility. Requires dry storage."
    },
    {
      "id": "pc",
      "name": "PC",
      "density_g_per_cm3": 1.20,
      "cost_per_gram": 0.07,
      "print_speed_cm3_per_hr": 5.0,
      "description": "Extremely strong and heat-resistant. High-temp printer required."
    }
  ]
}
```

All prices above are placeholders — owner updates these before going live.

---

## Squarespace Integration

**Squarespace page layout:**

```
[ Code Block ]
  <div id="filament-quoter"></div>
  <script src="https://USERNAME.github.io/filament-quoter/quoter.js"></script>

[ Form Block ]  ← hidden until quote accepted
  Fields:
    - Name (text, required)
    - Email (email, required)
    - Notes (textarea, optional)
    - File upload (STL/3MF, required)
    - quote_filament (hidden text)
    - quote_volume_cm3 (hidden text)
    - quote_breakdown (hidden text — human-readable summary)
    - quote_total (hidden text)
```

**Hiding/revealing the Form Block:** In Squarespace, assign a CSS ID (e.g., `quote-form-block`) to the Form Block via its block settings. Add a CSS snippet to the page's Custom CSS: `#quote-form-block { display: none; }`. On "Accept Quote", the wizard JS runs `document.getElementById('quote-form-block').style.display = 'block'`, sets hidden field values, scrolls to the block, and shows the banner. Customer completes and submits the form. Squarespace sends email notification to owner with all fields + attached file.

---

## Build & Deployment

- **Bundler:** Vite (produces single `quoter.js` output)
- **CDN dependencies:** JSZip from jsDelivr (for 3MF parsing)
- **GitHub Actions workflow:** on push to `main` → `npm run build` → deploy `dist/` to `gh-pages` branch
- **`config.json`:** copied from `public/` to `dist/` by Vite automatically (static asset)
- **CORS:** GitHub Pages serves with permissive CORS headers — `fetch('config.json')` from Squarespace domain works without extra configuration

---

## Verification

1. Run `npm run dev` locally — open browser, upload a test STL, verify volume appears and quote math matches hand calculation
2. Upload a test 3MF — verify JSZip unpacks and volume parses correctly
3. Test minimum order: use a tiny model where computed total < $19 — verify $19.00 is shown with the note
4. Accept a quote — verify hidden fields are populated and form scrolls into view
5. Deploy to GitHub Pages — verify Squarespace code block loads `quoter.js` from the Pages URL
6. Submit a test form in Squarespace — verify owner receives email notification with quote details and attached file
