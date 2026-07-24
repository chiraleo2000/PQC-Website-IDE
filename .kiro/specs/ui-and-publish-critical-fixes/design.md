# UI and Publish Critical Fixes Bugfix Design

## Overview

This bugfix addresses three critical defects in the PQC Website IDE that prevent users from creating and publishing websites:

1. **Non-functional Publish Button**: The button has no onClick handler, rendering it completely inoperative
2. **Inverted Canvas Rendering**: AstRenderer renders children before their parent node, breaking visual hierarchy and drag-and-drop expectations
3. **Silent API/Authentication Failures**: Missing error logging and retry mechanisms cause silent failures with no user feedback

The fix approach is targeted and minimal:
- Wire the Publish button to call the existing `/api/projects/:id/publish` endpoint
- Reorder the rendering in NodeWithDrops to render parent before children
- Add console logging for API errors and implement exponential backoff retry for authentication

## Glossary

- **Bug_Condition (C)**: The conditions that trigger each of the three bugs
- **Property (P)**: The desired behavior when each bug condition occurs - buttons should publish, rendering should be hierarchical, errors should be visible
- **Preservation**: All existing functionality that must remain unchanged - PQC cryptography, drag-and-drop mechanics, save operations, template loading
- **handlePublish**: New async function to be added to Header.tsx that calls the publish endpoint
- **NodeWithDrops**: Component in AstRenderer.tsx (lines 24-42) that currently renders children before parent
- **registerDevSession**: Function in WorkspaceLayout.tsx that authenticates with the API gateway (currently no retry on failure)
- **AstRenderer**: Canvas rendering component that uses @dnd-kit to display the page structure
- **syncProject**: Existing function that successfully encrypts and saves projects using ML-KEM-768 + ML-DSA-65

## Bug Details

### Bug Condition 1: Non-functional Publish Button

The Publish button in Header.tsx (line 95) has no onClick handler attached, making it completely non-functional.

**Formal Specification:**
```
FUNCTION isBugCondition1(userAction)
  INPUT: userAction of type ButtonClickEvent
  OUTPUT: boolean
  
  RETURN userAction.target == PublishButton
         AND userAction.type == "click"
         AND PublishButton.onClick == undefined
END FUNCTION
```

**Examples:**
- User clicks "Publish" → Nothing happens (no API call, no loading state, no feedback)
- User expects website deployment → System provides no response because handler is missing
- Save button works correctly → Publish button silently fails
- User checks network tab → No HTTP request is made to /api/projects/:id/publish

### Bug Condition 2: Inverted Canvas Rendering

The NodeWithDrops component in AstRenderer.tsx renders all children (lines 30-37) before rendering the parent node itself (line 39), causing inverted DOM structure.

**Formal Specification:**
```
FUNCTION isBugCondition2(node)
  INPUT: node of type AstNode
  OUTPUT: boolean
  
  RETURN node.children.length > 0
         AND renderOrder(node) == [children_first, dropZones, parent_last]
         AND expectedRenderOrder(node) == [parent_first, children_after]
END FUNCTION
```

**Examples:**
- Node with 2 children → Renders: [child1, child2, dropZone, parent] instead of [parent, child1, child2, dropZone]
- Drag-and-drop operation → Visual feedback shows inverted structure, confusing users
- Container with nested elements → DOM tree order doesn't match logical component hierarchy
- Parent background/border styles → Appear after children are rendered, breaking visual containment

### Bug Condition 3: Silent API and Authentication Failures

The WorkspaceLayout.tsx authentication (lines 11-20) catches errors but provides no console logging, and never retries failed connections.

**Formal Specification:**
```
FUNCTION isBugCondition3(apiState)
  INPUT: apiState of type {url: string, isAvailable: boolean}
  OUTPUT: boolean
  
  RETURN (apiState.url == "" OR apiState.isAvailable == false)
         AND registerDevSession() throws Error
         AND console.log(error) NOT called
         AND retryAttempts == 0
END FUNCTION
```

**Examples:**
- VITE_API_URL not configured → Auth fails silently, no console log, cryptoStatus shows "API unavailable"
- API gateway not running → Connection refused, no retry attempted, permanent error state
- Temporary network glitch → Single failure causes permanent lockout, no exponential backoff
- Developer debugging → No error details in console, must inspect network tab manually

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**

**PQC Cryptography Operations:**
- Save button must continue to encrypt AST using ML-KEM-768 + ML-DSA-65
- Signature verification using ML-DSA-65 must continue as implemented
- Key registration (generateSignKeypair, registerSignPublicKey) must remain unchanged
- Nonce validation and session management must continue to work

**Canvas and Drag-and-Drop:**
- Drag-and-drop from sidebar using @dnd-kit must continue to function
- Drop zone highlighting (border-accent, bg-accent/20) must remain unchanged
- Component selection and property editing must continue to work
- Template loading (Login/Blog demos) must populate canvas correctly

**API Sync Operations:**
- syncProject function must continue to work with the same encryption flow
- /api/projects/:id/sync endpoint behavior must remain unchanged
- AST version storage and nonce tracking must continue as implemented

**Scope:**
All inputs and operations that do NOT involve:
- Clicking the Publish button
- Rendering nodes with children in AstRenderer
- Initial authentication setup in WorkspaceLayout

These operations should be completely unaffected by this fix, including:
- Mouse clicks on Save button and template dropdowns
- Keyboard navigation and component property editing
- API calls to sync, export, and other endpoints
- Drag-and-drop mechanics and drop zone interactions

## Hypothesized Root Cause

### Bug 1: Non-functional Publish Button

**Most Likely Cause**: The Publish button was scaffolded but never wired to a handler function.

Evidence from Header.tsx line 95:
```tsx
<Button aria-label="Publish project">Publish</Button>
```

The Save button (line 89) has `onClick={handleSave}`, but Publish has no onClick prop. The `/api/projects/:id/publish` endpoint exists and is tested (projects.publish.test.ts), but the frontend never calls it.

### Bug 2: Inverted Canvas Rendering

**Most Likely Cause**: The rendering order in NodeWithDrops was structured to render drop zones first for layout reasons, but inadvertently placed the parent node last.

Evidence from AstRenderer.tsx lines 30-39:
```tsx
{node.children.map((child, i) => (
  <div key={child.id}>
    <DropZone parentId={node.id} index={i} />
    <NodeWithDrops node={child} selectedId={selectedId} onSelect={onSelect} />
  </div>
))}
<DropZone parentId={node.id} index={node.children.length} />
{renderAstNode(node, { selectedId, onSelect, depth: 0 })}
```

The parent node rendering (`renderAstNode(node, ...)`) is the last element in the return statement. This causes the parent to appear in the DOM after all its children, inverting the visual tree.

### Bug 3: Silent API and Authentication Failures

**Most Likely Cause**: Error handling was added to prevent crashes, but logging and retry logic were never implemented.

Evidence from WorkspaceLayout.tsx lines 11-20:
```tsx
registerDevSession()
  .then(async (session) => { /* ... */ })
  .catch(() => {
    useEditorStore.getState().setCryptoStatus("error", "API unavailable — start api-gateway");
  });
```

The catch block sets cryptoStatus but:
1. Never logs the error to console
2. Never attempts to retry the connection
3. Provides no diagnostic information (was it network? auth? URL missing?)
4. Leaves the user in permanent error state

Additionally, `auth.ts` and `projects.ts` use `const API = import.meta.env.VITE_API_URL ?? "";` which defaults to empty string, causing fetch to fail with confusing relative URL errors.

## Correctness Properties

Property 1: Bug Condition 1 - Publish Button Functionality

_For any_ user action where the Publish button is clicked and authentication is valid (authToken, projectId exist), the fixed Header component SHALL call the `/api/projects/:id/publish` endpoint with proper authentication headers and display success/error feedback to the user.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Bug Condition 2 - Hierarchical Canvas Rendering

_For any_ AstNode with children, the fixed NodeWithDrops component SHALL render the parent node first, followed by its children in order, followed by drop zones, maintaining proper DOM hierarchy that matches the logical component tree structure.

**Validates: Requirements 2.4, 2.5, 2.6**

Property 3: Bug Condition 3 - Visible Error Logging

_For any_ API or authentication failure (network error, missing config, service unavailable), the fixed system SHALL log detailed error information to console.error with actionable diagnostic context (endpoint, error message, configuration status).

**Validates: Requirements 2.7, 2.10**

Property 4: Bug Condition 3 - Authentication Retry with Backoff

_For any_ authentication failure in WorkspaceLayout, the fixed system SHALL implement exponential backoff retry logic (retry after 1s, 2s, 4s, up to 3 total attempts) before entering permanent error state, allowing recovery from transient network issues.

**Validates: Requirements 2.8, 2.9**

Property 5: Preservation - PQC Cryptography Operations

_For any_ save operation, key registration, or signature verification, the fixed system SHALL produce exactly the same cryptographic behavior as the original system, using ML-KEM-768, ML-DSA-65, and the crypto-service on port 4081 without modification.

**Validates: Requirements 3.6, 3.7, 3.8**

Property 6: Preservation - Drag-and-Drop Mechanics

_For any_ drag operation from the sidebar or drop zone interaction, the fixed system SHALL produce exactly the same @dnd-kit behavior as the original system, including drop zone highlighting and component insertion at the correct index.

**Validates: Requirements 3.9, 3.10**

Property 7: Preservation - Existing API Operations

_For any_ API call to /api/projects/:id/sync, /api/projects/:id/export, or /api/auth/* endpoints, the fixed system SHALL produce exactly the same request format, headers, and behavior as the original system.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

#### Fix 1: Wire Publish Button Handler

**File**: `apps/web/src/components/organisms/Header.tsx`

**Function**: Add new `handlePublish` async function

**Specific Changes**:

1. **Import publish API helper**: Add or create a `publishProject` function in `api/projects.ts` that mirrors the structure of `syncProject`
   
2. **Create handlePublish function** (insert after handleSave, around line 48):
   ```tsx
   async function handlePublish() {
     if (!authToken || !projectId) {
       setCryptoStatus("error", "Cannot publish: not authenticated");
       return;
     }
     
     setCryptoStatus("encrypting"); // Reuse existing status during publish
     try {
       await publishProject({ projectId, authToken });
       setCryptoStatus("saved");
       // TODO: Display success message with published URL
       if (import.meta.env.DEV) {
         console.log("[PQC] Project published successfully");
       }
     } catch (e) {
       setCryptoStatus("error", e instanceof Error ? e.message : "Publish failed");
       console.error("[PQC] Publish failed:", e);
     }
   }
   ```

3. **Wire onClick handler** (line 95):
   ```tsx
   <Button onClick={handlePublish} aria-label="Publish project">Publish</Button>
   ```

4. **Create publishProject API function** in `apps/web/src/api/projects.ts`:
   ```tsx
   export async function publishProject(params: {
     projectId: string;
     authToken: string;
   }): Promise<void> {
     // Generate signed publish intent (similar to syncProject encryption)
     // This requires creating publishIntent with nonce and signature
     // For MVP: simple authenticated POST may suffice if endpoint allows it
     
     const res = await fetch(`${API}/api/projects/${params.projectId}/publish`, {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         Authorization: `Bearer ${params.authToken}`,
       },
       body: JSON.stringify({ /* publish intent payload */ }),
     });
     
     if (!res.ok) {
       const body = await res.json().catch(() => ({}));
       throw new Error((body as { message?: string }).message ?? `Publish failed: ${res.status}`);
     }
   }
   ```

Note: The publish endpoint requires a signed publish intent (see `validatePublishIntent` middleware). We need to implement `signPublishIntent` similar to how `encryptAndSignAst` works for sync.

#### Fix 2: Reorder Parent-Before-Children Rendering

**File**: `apps/web/src/canvas/AstRenderer.tsx`

**Function**: `NodeWithDrops` component (lines 24-42)

**Specific Changes**:

1. **Move parent rendering before children** - Change the return statement to render parent first:
   ```tsx
   return (
     <div className="relative">
       {renderAstNode(node, { selectedId, onSelect, depth: 0 })}
       {node.children.map((child, i) => (
         <div key={child.id}>
           <DropZone parentId={node.id} index={i} />
           <NodeWithDrops node={child} selectedId={selectedId} onSelect={onSelect} />
         </div>
       ))}
       <DropZone parentId={node.id} index={node.children.length} />
     </div>
   );
   ```

The only change is moving line 39 (`renderAstNode(node, ...)`) to the top of the JSX, immediately after `<div className="relative">`.

#### Fix 3: Add Error Logging

**File**: `apps/web/src/api/auth.ts`

**Specific Changes**:

1. **Add console logging to registerDevSession**:
   ```tsx
   export async function registerDevSession(): Promise<DevSession> {
     const API = import.meta.env.VITE_API_URL ?? "";
     
     if (!API) {
       console.error("[PQC Auth] VITE_API_URL is not configured. Set it in .env file.");
       throw new Error("API URL not configured");
     }
     
     try {
       const res = await fetch(`${API}/api/auth/dev-register`, {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email: "dev@localhost", password: "dev-password-32-chars-min!!" }),
       });
       
       if (!res.ok) {
         console.error(`[PQC Auth] Registration failed: ${res.status} ${res.statusText}`);
         throw new Error(`Auth failed: ${res.status}`);
       }
       
       return res.json() as Promise<DevSession>;
     } catch (e) {
       console.error("[PQC Auth] Network error during registration:", e);
       throw e;
     }
   }
   ```

2. **Add logging to registerSignPublicKey** (similar pattern)

**File**: `apps/web/src/api/projects.ts`

**Specific Changes**:

1. **Add console logging to syncProject** (wrap existing fetch in try-catch with logging)

#### Fix 4: Implement Exponential Backoff Retry

**File**: `apps/web/src/app/WorkspaceLayout.tsx`

**Specific Changes**:

1. **Replace authentication logic with retry mechanism**:
   ```tsx
   useEffect(() => {
     let attempts = 0;
     const maxAttempts = 3;
     
     async function attemptAuth() {
       try {
         const session = await registerDevSession();
         const { publicKeyB64 } = await generateSignKeypair();
         await registerSignPublicKey(session.token, session.signerPublicKeyId, publicKeyB64);
         setAuth(session.token, session.signerPublicKeyId, session.kemPublicKeyB64);
       } catch (e) {
         attempts++;
         console.error(`[PQC] Auth attempt ${attempts}/${maxAttempts} failed:`, e);
         
         if (attempts < maxAttempts) {
           const delayMs = Math.pow(2, attempts - 1) * 1000; // 1s, 2s, 4s
           console.log(`[PQC] Retrying in ${delayMs}ms...`);
           setTimeout(attemptAuth, delayMs);
         } else {
           console.error("[PQC] All auth attempts failed. Check that api-gateway is running on port 4000");
           useEditorStore.getState().setCryptoStatus("error", "API unavailable — start api-gateway");
         }
       }
     }
     
     attemptAuth();
   }, [setAuth]);
   ```

2. **Important**: Add cleanup to prevent memory leaks if component unmounts during retry

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate each bug on unfixed code, then verify the fixes work correctly and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bugs BEFORE implementing the fixes. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate each bug condition and assert the expected behavior. Run these tests on the UNFIXED code to observe failures and understand the root causes.

**Test Cases**:

1. **Publish Button Test**: Simulate clicking Publish button with valid auth (will fail on unfixed code - no handler)
   - Mock authentication state with valid projectId and authToken
   - Simulate button click event
   - Assert that fetch was called with `/api/projects/:id/publish`
   - Expected failure: onClick handler is undefined, nothing happens

2. **Inverted Rendering Test**: Render a node with 2 children and inspect DOM order (will fail on unfixed code)
   - Create test AST with parent node containing 2 children
   - Render NodeWithDrops component
   - Query DOM to check element order
   - Expected failure: Children appear before parent in DOM tree

3. **Silent Error Test**: Trigger auth failure and check console (will fail on unfixed code - no logging)
   - Mock fetch to throw network error
   - Call registerDevSession
   - Assert console.error was called with error details
   - Expected failure: No console logging occurs

4. **No Retry Test**: Trigger auth failure and verify no retry (will fail on unfixed code)
   - Mock fetch to fail once then succeed
   - Call authentication flow
   - Assert only 1 fetch attempt was made
   - Expected failure: No retry mechanism exists

**Expected Counterexamples**:
- Publish button click has no effect (no network request in browser devtools)
- Canvas DOM structure shows `[child1, child2, parent]` instead of `[parent, child1, child2]`
- Console is empty when API calls fail (no error messages)
- Authentication fails permanently after single network error (no retry attempts)

Possible causes:
- Missing onClick handler on Publish button component
- Incorrect JSX element ordering in NodeWithDrops return statement
- Missing console.error calls in catch blocks
- No retry loop in WorkspaceLayout useEffect

### Fix Checking

**Goal**: Verify that for all inputs where the bug conditions hold, the fixed functions produce the expected behavior.

**Pseudocode:**

**Fix 1 - Publish Button:**
```
FOR ALL userAction WHERE isBugCondition1(userAction) DO
  result := handlePublish(projectId, authToken)
  ASSERT fetch was called with correct endpoint and headers
  ASSERT user sees success or error feedback
END FOR
```

**Fix 2 - Hierarchical Rendering:**
```
FOR ALL node WHERE isBugCondition2(node) DO
  rendered := NodeWithDrops_fixed(node)
  domOrder := getDOMElementOrder(rendered)
  ASSERT domOrder[0] == parentElement
  ASSERT domOrder[1..n] == childElements in correct sequence
END FOR
```

**Fix 3 - Error Logging:**
```
FOR ALL apiFailure WHERE isBugCondition3(apiFailure) DO
  TRY registerDevSession() CATCH error
  ASSERT console.error was called
  ASSERT error message contains diagnostic details
END FOR
```

**Fix 4 - Retry Logic:**
```
FOR ALL transientFailure WHERE isBugCondition3(transientFailure) DO
  mock_fetch_to_fail_twice_then_succeed()
  result := attemptAuthWithRetry()
  ASSERT fetch was called 3 times
  ASSERT authentication eventually succeeded
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug conditions do NOT hold, the fixed functions produce the same result as the original functions.

**Pseudocode:**

**Preserve PQC Crypto:**
```
FOR ALL saveOperation WHERE NOT isBugCondition1(saveOperation) DO
  ASSERT syncProject_original(params) = syncProject_fixed(params)
  ASSERT ML-KEM-768 encryption behavior unchanged
  ASSERT ML-DSA-65 signature behavior unchanged
END FOR
```

**Preserve Drag-and-Drop:**
```
FOR ALL dragOperation WHERE NOT isBugCondition2(dragOperation) DO
  ASSERT dropZone highlighting unchanged
  ASSERT component insertion index calculation unchanged
  ASSERT @dnd-kit integration unchanged
END FOR
```

**Preserve Other API Calls:**
```
FOR ALL apiCall WHERE apiCall.endpoint != "/api/projects/:id/publish" DO
  ASSERT fetch behavior unchanged
  ASSERT headers unchanged
  ASSERT error handling unchanged (except for added logging)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for save operations, drag-and-drop, and template loading, then write property-based tests capturing that behavior.

**Test Cases**:

1. **Save Operation Preservation**: Observe that Save button encrypts and syncs correctly on unfixed code, then verify identical behavior after fix
   - Generate random AST structures
   - Call syncProject with various auth states
   - Verify encryption payload format unchanged
   - Verify API call structure unchanged

2. **Drag-and-Drop Preservation**: Observe that drag-and-drop works correctly on unfixed code, then verify identical behavior after fix
   - Simulate dragging various components from sidebar
   - Drop at different indices within containers
   - Verify drop zone highlighting unchanged
   - Verify component insertion position unchanged

3. **Template Loading Preservation**: Observe that Login/Blog templates load correctly on unfixed code, then verify identical behavior after fix
   - Load each template
   - Verify AST structure matches expected
   - Verify canvas renders correctly

4. **Authentication Flow Preservation**: Observe successful authentication behavior on unfixed code, then verify it still works (with added retry capability)
   - Mock successful API responses
   - Verify key generation and registration unchanged
   - Verify setAuth is called with same parameters

### Unit Tests

**Publish Button:**
- Test handlePublish with valid auth state
- Test handlePublish with missing authToken
- Test handlePublish with missing projectId
- Test handlePublish success response handling
- Test handlePublish error response handling

**Canvas Rendering:**
- Test NodeWithDrops with 0 children (no rendering change needed)
- Test NodeWithDrops with 1 child (parent first)
- Test NodeWithDrops with multiple children (parent first, children in order)
- Test drop zone positioning after reordering

**Error Logging:**
- Test registerDevSession with missing VITE_API_URL
- Test registerDevSession with network error
- Test registerDevSession with 404 response
- Test syncProject with API error
- Verify console.error called with expected messages

**Retry Logic:**
- Test attemptAuth with immediate success (1 attempt)
- Test attemptAuth with 1 failure then success (2 attempts, 1s delay)
- Test attemptAuth with 2 failures then success (3 attempts, 1s + 2s delays)
- Test attemptAuth with 3 failures (max attempts reached, error state)
- Test exponential backoff timing (1s, 2s, 4s)

### Property-Based Tests

**Publish Flow:**
- Generate random project states (various AST structures, auth states)
- Verify publish request format matches API expectations
- Verify error handling covers all error types

**Hierarchical Rendering:**
- Generate random AST trees with varying depths and child counts
- Verify parent always renders before children in DOM
- Verify drop zones maintain correct positions

**Error Recovery:**
- Generate random API failure patterns (timeouts, 500s, network errors)
- Verify all errors are logged with diagnostic context
- Verify retry logic eventually succeeds for transient failures
- Verify permanent failures reach error state after max attempts

**Preservation:**
- Generate random save operations and verify identical encryption behavior
- Generate random drag-and-drop sequences and verify identical insertion behavior
- Generate random authentication successes and verify identical key registration

### Integration Tests

**Full Publish Flow:**
- Load IDE, authenticate, load template, click Publish
- Verify network request to /api/projects/:id/publish
- Verify success message displayed
- Verify error message displayed on failure

**Full Canvas Interaction:**
- Load IDE, drag components to canvas
- Verify visual hierarchy matches logical structure
- Verify drag-and-drop still works after rendering fix
- Verify component selection and editing still work

**Full Error Recovery:**
- Start IDE with API gateway stopped
- Observe retry attempts in console
- Start API gateway during retry window
- Verify authentication succeeds and IDE becomes functional

**Regression Testing:**
- Execute existing E2E tests from apps/e2e
- Verify all cryptography tests in apps/security-tests still pass
- Verify save/load/template functionality unchanged
