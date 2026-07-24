# Implementation Plan

## Phase 1: Exploration - Write Tests BEFORE Fix

- [x] 1. Write bug condition exploration tests
  - **Property 1: Bug Condition** - Three Critical UI Bugs
  - **IMPORTANT**: Write these property-based tests BEFORE implementing any fixes
  - **CRITICAL**: These tests MUST FAIL on unfixed code - failure confirms the bugs exist
  - **DO NOT attempt to fix the tests or the code when they fail**
  - **NOTE**: These tests encode the expected behavior - they will validate the fixes when they pass after implementation
  - **GOAL**: Surface counterexamples that demonstrate each bug exists
  - **Scoped PBT Approach**: For deterministic bugs, scope properties to concrete failing cases to ensure reproducibility
  
  - **Test 1.1: Publish Button Has No Handler**
    - Test that clicking the Publish button in Header.tsx triggers no onClick handler
    - Mock authentication state with valid projectId and authToken
    - Simulate button click event on the Publish button
    - Assert that NO fetch call was made to `/api/projects/:id/publish`
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test FAILS (confirms Publish button is non-functional)
    - Document counterexample: "Publish button click has no effect, no network request made"
  
  - **Test 1.2: Canvas Rendering is Inverted**
    - Test that NodeWithDrops renders children before parent
    - Create test AST with parent node containing 2 children (e.g., Container with Text and Button)
    - Render NodeWithDrops component using the test AST
    - Query DOM to extract element order
    - Assert that parent element appears AFTER children in DOM structure
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test FAILS (confirms inverted rendering order)
    - Document counterexample: "DOM shows [child1, child2, dropZone, parent] instead of [parent, child1, child2, dropZone]"
  
  - **Test 1.3: API Errors Are Silent**
    - Test that authentication failures produce no console output
    - Mock fetch to throw network error for `/api/auth/dev-register`
    - Clear console spy
    - Call registerDevSession() and catch the error
    - Assert that console.error was NOT called
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test FAILS (confirms no error logging exists)
    - Document counterexample: "Authentication failure produces no console output"
  
  - **Test 1.4: Authentication Has No Retry Logic**
    - Test that authentication failures are not retried
    - Mock fetch to fail once with network error, then succeed on second call
    - Call the authentication flow in WorkspaceLayout
    - Assert that fetch was called only ONCE (no retry attempted)
    - Run test on UNFIXED code
    - **EXPECTED OUTCOME**: Test FAILS (confirms no retry mechanism exists)
    - Document counterexample: "Single auth failure causes permanent error state, no retry attempts"
  
  - Mark task complete when all tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9_

## Phase 2: Preservation - Capture Current Behavior

- [ ] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Buggy Behavior Must Be Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - **GOAL**: Capture baseline behavior that must not change after fixes are applied
  
  - **Test 2.1: Observe and Preserve Save Operation**
    - Observe behavior on UNFIXED code for save operations
    - Load template, modify AST, click Save button
    - Record: syncProject is called with correct encryption parameters
    - Record: ML-KEM-768 and ML-DSA-65 are used for encryption and signing
    - Write property-based test: For all AST structures, syncProject produces same encryption payload format
    - Verify test passes on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline save behavior to preserve)
  
  - **Test 2.2: Observe and Preserve Drag-and-Drop**
    - Observe behavior on UNFIXED code for drag-and-drop operations
    - Drag Button component from sidebar to canvas at various positions
    - Record: Drop zones highlight correctly with border-accent
    - Record: Components insert at correct index in parent.children array
    - Write property-based test: For all drag-drop sequences, component insertion index and highlighting unchanged
    - Verify test passes on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline drag-drop behavior to preserve)
  
  - **Test 2.3: Observe and Preserve Template Loading**
    - Observe behavior on UNFIXED code for template loading
    - Load Login template and Blog template
    - Record: AST structure matches expected component tree
    - Record: Canvas renders all components in correct hierarchy
    - Write property-based test: For all templates, AST structure and rendering unchanged
    - Verify test passes on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline template behavior to preserve)
  
  - **Test 2.4: Observe and Preserve Authentication Success**
    - Observe behavior on UNFIXED code for successful authentication
    - Mock successful responses from /api/auth/dev-register and /api/auth/sign-public-key
    - Record: generateSignKeypair generates keypair
    - Record: setAuth is called with token, signerPublicKeyId, kemPublicKeyB64
    - Write property-based test: For successful auth, key generation and registration flow unchanged
    - Verify test passes on UNFIXED code
    - **EXPECTED OUTCOME**: Test PASSES (confirms baseline auth success behavior to preserve)
  
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 3: Implementation - Apply Fixes

- [ ] 3. Fix for non-functional Publish button

  - [~] 3.1 Create publishProject API function
    - Create `publishProject` function in `apps/web/src/api/projects.ts`
    - Import and use existing API URL configuration
    - Implement signed publish intent generation (similar to syncProject encryption flow)
    - Function should accept projectId and authToken parameters
    - Make POST request to `/api/projects/:id/publish` with proper headers
    - Include Authorization header with Bearer token
    - Handle response errors with descriptive messages
    - Throw error with message from response body if request fails
    - _Bug_Condition: isBugCondition1(userAction) where userAction.target == PublishButton AND PublishButton.onClick == undefined_
    - _Expected_Behavior: User clicks Publish → handlePublish calls /api/projects/:id/publish → success/error feedback displayed_
    - _Preservation: All existing API operations (sync, export, auth) must remain unchanged (Requirements 3.1, 3.2)_
    - _Requirements: 2.1, 2.2, 2.3_

  - [~] 3.2 Implement handlePublish function in Header.tsx
    - Add handlePublish async function after handleSave (around line 48)
    - Check for valid authToken and projectId before proceeding
    - Set cryptoStatus to "encrypting" during publish operation (reuse existing status)
    - Call publishProject with projectId and authToken
    - On success: set cryptoStatus to "saved" and log success in dev mode
    - On error: set cryptoStatus to "error" with error message and log to console
    - Handle both Error instances and unknown error types
    - _Bug_Condition: PublishButton.onClick == undefined_
    - _Expected_Behavior: Button click triggers handlePublish which calls API endpoint_
    - _Preservation: handleSave and all existing button handlers must remain unchanged_
    - _Requirements: 2.1, 2.2, 2.3_

  - [~] 3.3 Wire Publish button onClick handler
    - Locate Publish button in Header.tsx (line 95)
    - Add onClick={handlePublish} prop to Button component
    - Verify Button aria-label remains "Publish project"
    - _Bug_Condition: Publish button has no onClick prop_
    - _Expected_Behavior: Button has onClick={handlePublish} prop_
    - _Preservation: All other button props and styling unchanged_
    - _Requirements: 2.1_

  - [~] 3.4 Verify publish button exploration test now passes
    - **Property 1: Expected Behavior** - Publish Button Calls API Endpoint
    - **IMPORTANT**: Re-run the SAME test from task 1, specifically Test 1.1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run Test 1.1: Publish button click triggers fetch to `/api/projects/:id/publish`
    - **EXPECTED OUTCOME**: Test PASSES (confirms Publish bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3_

- [ ] 4. Fix for inverted canvas rendering

  - [~] 4.1 Reorder rendering in NodeWithDrops component
    - Open `apps/web/src/canvas/AstRenderer.tsx`
    - Locate NodeWithDrops component (lines 24-42)
    - Move parent rendering (`renderAstNode(node, ...)`) from line 39 to immediately after opening `<div className="relative">`
    - Keep children rendering in same position (lines 30-37)
    - Keep final drop zone in same position (line 38)
    - New order: parent node → children with drop zones → final drop zone
    - Verify no other changes to component logic or props
    - _Bug_Condition: isBugCondition2(node) where node.children.length > 0 AND renderOrder == [children_first, parent_last]_
    - _Expected_Behavior: renderOrder == [parent_first, children_after] for proper DOM hierarchy_
    - _Preservation: Drop zone positioning, @dnd-kit integration, and drag-drop mechanics unchanged (Requirements 3.9, 3.10)_
    - _Requirements: 2.4, 2.5, 2.6_

  - [~] 4.2 Verify canvas rendering exploration test now passes
    - **Property 1: Expected Behavior** - Parent Renders Before Children
    - **IMPORTANT**: Re-run the SAME test from task 1, specifically Test 1.2 - do NOT write a new test
    - Run Test 1.2: DOM structure shows [parent, child1, child2, dropZone]
    - **EXPECTED OUTCOME**: Test PASSES (confirms rendering bug is fixed)
    - _Requirements: 2.4, 2.5, 2.6_

- [ ] 5. Fix for silent API and authentication failures

  - [~] 5.1 Add error logging to registerDevSession
    - Open `apps/web/src/api/auth.ts`
    - Locate registerDevSession function
    - Add check for missing VITE_API_URL at function start
    - Log error with "[PQC Auth] VITE_API_URL is not configured" message if missing
    - Wrap fetch in try-catch block
    - On !res.ok: log error with "[PQC Auth] Registration failed: {status} {statusText}"
    - On network error: log error with "[PQC Auth] Network error during registration: {error}"
    - Use console.error for all error logging
    - _Bug_Condition: isBugCondition3(apiState) where registerDevSession() throws Error AND console.log(error) NOT called_
    - _Expected_Behavior: All API errors logged to console with diagnostic context_
    - _Preservation: Auth function behavior and return values unchanged, only adds logging (Requirements 3.6)_
    - _Requirements: 2.7, 2.10_

  - [~] 5.2 Add error logging to registerSignPublicKey
    - In same file `apps/web/src/api/auth.ts`
    - Locate registerSignPublicKey function
    - Add similar logging pattern as registerDevSession
    - Log "[PQC Auth] Sign key registration failed: {status}" on !res.ok
    - Log "[PQC Auth] Network error during sign key registration: {error}" on catch
    - _Bug_Condition: API errors produce no console output_
    - _Expected_Behavior: All sign key errors logged with context_
    - _Preservation: Function behavior and API calls unchanged, only adds logging_
    - _Requirements: 2.7, 2.10_

  - [~] 5.3 Add error logging to syncProject
    - Open `apps/web/src/api/projects.ts`
    - Locate syncProject function
    - Wrap existing fetch in try-catch block
    - On !res.ok: log "[PQC Projects] Sync failed: {status} {statusText}"
    - On network error: log "[PQC Projects] Network error during sync: {error}"
    - _Bug_Condition: Project API errors produce no console output_
    - _Expected_Behavior: All project errors logged with context_
    - _Preservation: Encryption and sync behavior unchanged (Requirements 3.3, 3.7, 3.8)_
    - _Requirements: 2.7, 2.10_

  - [~] 5.4 Implement exponential backoff retry in WorkspaceLayout
    - Open `apps/web/src/app/WorkspaceLayout.tsx`
    - Locate authentication useEffect (lines 11-20)
    - Replace current auth logic with retry mechanism
    - Create attemptAuth async function that wraps auth flow
    - Implement retry counter (maxAttempts = 3)
    - On error: log attempt number and error details
    - If attempts < maxAttempts: calculate delay as Math.pow(2, attempts - 1) * 1000 (1s, 2s, 4s)
    - Use setTimeout to retry after delay
    - On final failure: log "[PQC] All auth attempts failed" and set error status
    - Add cleanup to prevent memory leaks if component unmounts during retry
    - _Bug_Condition: isBugCondition3(apiState) where registerDevSession() throws Error AND retryAttempts == 0_
    - _Expected_Behavior: Exponential backoff retry (1s, 2s, 4s, up to 3 attempts) before permanent error_
    - _Preservation: Successful auth flow (key generation, registration) unchanged (Requirements 3.6, 3.7)_
    - _Requirements: 2.8, 2.9, 2.10_

  - [~] 5.5 Verify API error exploration tests now pass
    - **Property 1: Expected Behavior** - API Errors Produce Console Logs
    - **IMPORTANT**: Re-run the SAME tests from task 1, specifically Test 1.3 and Test 1.4 - do NOT write new tests
    - Run Test 1.3: Authentication failures produce console.error output
    - Run Test 1.4: Authentication failures trigger exponential backoff retry
    - **EXPECTED OUTCOME**: Both tests PASS (confirms error handling bugs are fixed)
    - _Requirements: 2.7, 2.8, 2.9, 2.10_

- [ ] 6. Verify all fixes are complete

  - [~] 6.1 Run all bug condition tests
    - **Property 1: Expected Behavior** - All Three Bugs Fixed
    - Re-run all exploration tests from task 1 (Tests 1.1, 1.2, 1.3, 1.4)
    - Verify all tests now PASS on fixed code
    - **EXPECTED OUTCOME**: All exploration tests PASS
    - Document results: "All bug conditions now satisfy expected behavior"
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [~] 6.2 Verify preservation tests still pass
    - **Property 2: Preservation** - No Regressions in Existing Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run all preservation tests from task 2 (Tests 2.1, 2.2, 2.3, 2.4)
    - Verify all tests still PASS on fixed code (no regressions)
    - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no behavior changes for non-buggy operations)
    - Document results: "All existing functionality preserved - save, drag-drop, templates, auth success unchanged"
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

## Phase 4: Validation

- [~] 7. Checkpoint - Ensure all tests pass
  - Run complete test suite including exploration and preservation tests
  - Verify no test failures or regressions
  - If any tests fail, investigate and fix before proceeding
  - Ask the user if questions arise during validation
  - Document final test results
