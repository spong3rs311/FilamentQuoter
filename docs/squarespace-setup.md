# Squarespace Setup Guide

Complete these steps in your Squarespace admin after the GitHub Actions deployment is live.

## Prerequisites

Verify the deployment is live before starting:
- `https://spong3rs311.github.io/FilamentQuoter/quoter.js` — should return JavaScript
- `https://spong3rs311.github.io/FilamentQuoter/config.json` — should return JSON

If the Actions run is still in progress, wait for the green checkmark at:
`https://github.com/spong3rs311/FilamentQuoter/actions`

Also enable GitHub Pages first:
1. Go to `https://github.com/spong3rs311/FilamentQuoter/settings/pages`
2. Source: **Deploy from a branch** → Branch: `gh-pages` → `/ (root)` → Save

---

## Step 1 — Add the Code Block

On your Squarespace quoter page, add a **Code Block** and paste:

```html
<div id="filament-quoter"></div>
<script src="https://spong3rs311.github.io/FilamentQuoter/quoter.js"></script>
```

---

## Step 2 — Add the Form Block

Add a **Form Block** below the Code Block with these fields (in order):

| Field type | Label | Field name | Required |
|---|---|---|---|
| Short Answer | Name | — | Yes |
| Email | Email Address | — | Yes |
| File Upload | Upload your STL or 3MF file | — | Yes |
| Long Answer | Additional notes | — | No |
| Short Answer | *(hidden)* | `quote_filament` | No |
| Short Answer | *(hidden)* | `quote_volume_cm3` | No |
| Long Answer | *(hidden)* | `quote_breakdown` | No |
| Short Answer | *(hidden)* | `quote_total` | No |

For the hidden fields: in each field's settings, set the **Field Name** exactly as shown above. You can mark them as hidden or leave them visible with no label — Squarespace will include them in the submission email either way.

---

## Step 3 — Assign a CSS ID to the Form Block

1. Click the Form Block to select it
2. Click the pencil/edit icon → **Advanced**
3. Set **CSS ID** to: `quote-form-block`
4. Save

---

## Step 4 — Hide the Form Block Until Quote is Accepted

In Squarespace: **Pages** → select your quoter page → **Page Settings** → **Advanced** → **Page Header Code Injection**

Paste:
```html
<style>#quote-form-block { display: none; }</style>
```

Save. The form will now be hidden until the customer clicks "Accept Quote."

---

## Step 5 — Set Up Email Notification

1. Click the Form Block → edit → **Storage** tab
2. Select **Email** and add your email address
3. Save

Squarespace will send you an email for every form submission, including all quote fields and the uploaded file.

---

## Step 6 — End-to-End Test

1. Visit your Squarespace page and upload a test STL file
2. Select a filament
3. Verify the quote math looks correct
4. Click "Accept Quote"
5. Verify: step 4 banner appears, form scrolls into view, hidden fields are populated
6. Fill in name, email, re-upload the file, and submit
7. Verify you receive the notification email with all quote details and the attached file

---

## Updating Prices

Edit `public/config.json` in the project, then push to `main`. GitHub Actions rebuilds and redeploys automatically in ~60 seconds. No Squarespace changes needed.
