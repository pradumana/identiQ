# Troubleshooting White Page Issue

If you're seeing a white page at `http://localhost:8080/`, follow these steps:

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12)
2. Go to the **Console** tab
3. Look for any **red error messages**
4. Common errors:
   - `Failed to fetch` - Backend not running
   - `Cannot find module` - Missing dependency
   - `Unexpected token` - Syntax error
   - `Cannot read property` - Runtime error

## Step 2: Verify Dev Server is Running

```bash
# Make sure you're in the project root
cd secure-kyc-chain

# Start the dev server
npm run dev
```

You should see output like:
```
  VITE v7.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

## Step 3: Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Refresh the page
4. Check if files are loading:
   - `index.html` - Should return 200
   - `main.tsx` - Should return 200
   - `index.css` - Should return 200
   - Any failed requests (red) indicate the issue

## Step 4: Clear Browser Cache

1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Or clear cache in browser settings

## Step 5: Reinstall Dependencies

```bash
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

## Step 6: Check for TypeScript Errors

```bash
# Check for TypeScript errors
npx tsc --noEmit
```

## Step 7: Verify index.html

Make sure `index.html` exists in the root and has:
```html
<div id="root"></div>
<script type="module" src="/src/main.tsx"></script>
```

## Step 8: Check ErrorBoundary

I've added an ErrorBoundary component. If there's a React error, you should see an error message instead of a white page.

## Common Issues and Solutions

### Issue: "Failed to fetch" errors
**Solution:** Backend is not running. Start it:
```bash
cd backend
uvicorn main:app --reload
```

### Issue: "Cannot find module '@/components/...'"
**Solution:** Check `tsconfig.json` and `vite.config.ts` for path aliases

### Issue: Port 8080 already in use
**Solution:** 
1. Kill the process using port 8080
2. Or change port in `vite.config.ts`

### Issue: CSS not loading
**Solution:** Check if `src/index.css` exists and is imported in `main.tsx`

## Quick Test

Create a simple test to verify React is working:

1. Open browser console
2. Type: `document.getElementById('root')`
3. Should return the root div element
4. If null, the HTML isn't loading

## Still Not Working?

1. Check the terminal where `npm run dev` is running for errors
2. Share the browser console errors
3. Check if the ErrorBoundary is showing an error message

