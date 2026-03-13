---
name: browse
description: |
  Web browsing for Gemini CLI via `mcp_chrome-devtools`. Navigate to any URL,
  read page content, click elements, fill forms, run JavaScript, take screenshots,
  inspect CSS/DOM, and verify a11y.
---

# gstack: Chrome DevTools Browsing

This skill uses the `mcp_chrome-devtools` server to give you "eyes" in the browser.

## Philosophy
- **Verification First:** Don't just assume a page looks correct; verify it by inspecting the DOM or taking a screenshot.
- **Accessibility is Core:** Use the `take_snapshot` tool (based on the a11y tree) to understand the page structure, not just the raw HTML.
- **Performance Matters:** Run Lighthouse audits to identify performance bottlenecks.

## Browse Capabilities

### 1. Navigation & Content
- **`new_page(url)`:** Open a new tab and go to the URL.
- **`navigate_page(type='url', url='...')`:** Go to a specific URL in the current tab.
- **`take_snapshot()`:** Get a text representation of the page using the accessibility tree. (PREFERRED over raw DOM).
- **`evaluate_script(function)`:** Run custom JavaScript to extract data or interact with the page.

### 2. Interaction
- **`click(uid)`:** Click on an element identified by its UID from the snapshot.
- **`fill(uid, value)`:** Type text into an input field or select an option.
- **`press_key(key)`:** Send keyboard events (e.g., 'Enter', 'Escape').
- **`hover(uid)`:** Trigger hover states for CSS verification.

### 3. Inspection & Verification
- **`take_screenshot()`:** Capture a visual representation of the page or an element.
- **`list_console_messages()`:** Check for JavaScript errors or logs.
- **`list_network_requests()`:** Verify that API calls are happening as expected.
- **`lighthouse_audit()`:** Get scores for A11y, SEO, and Best Practices.

## Performance Tips
1. **Navigate Once, Query Many:** Load the page, then use `take_snapshot` to find UIDs. Use those UIDs for multiple interactions without re-loading.
2. **Use Snapshots for State:** Check if a button is disabled or a loader is present by taking a quick snapshot.
3. **Lighthouse for Quality:** Run an audit on key pages (Home, Checkout) to ensure we meet performance and accessibility standards.

## Output Format
1. **Browse Status:** (SUCCESS / FAILED).
2. **Current URL:** The URL of the page being browsed.
3. **Page Summary:** 2-3 sentences on what you see.
4. **Console/Network Status:** Any errors or interesting findings.
5. **Next Step:** What should you do next on this page?
