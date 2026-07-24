# Bugfix Requirements Document

## Introduction

The PQC Website IDE has critical failures preventing users from creating and publishing websites. The system suffers from three primary defects:

1. **Non-functional Publish Button**: The publish button has no onClick handler, making it completely non-functional
2. **Inverted Canvas Rendering**: The AstRenderer component renders children before their parent node, causing visual tree structure inversion and breaking drag-and-drop functionality
3. **Silent API/Authentication Failures**: Missing environment configuration causes API communication to fail silently with no error feedback, and authentication failures have no retry mechanism

These bugs combine to create a completely broken user experience where the UI doesn't render properly, publish operations do nothing, and errors are invisible to users.

## Bug Analysis

### Current Behavior (Defect)

#### 1. Non-functional Publish Button

1.1 WHEN the user clicks the Publish button in Header.tsx THEN the system does nothing because no onClick handler is attached

1.2 WHEN the user attempts to deploy their website THEN the system provides no feedback or action because the button is not wired to the publish endpoint

#### 2. Inverted Canvas Rendering (Visual Tree Bug)

1.3 WHEN AstRenderer renders a node with children in NodeWithDrops component THEN the system renders all children before rendering the parent node itself (lines 30-49 in AstRenderer.tsx)

1.4 WHEN users drag and drop components THEN the system displays an inverted visual hierarchy that breaks layout expectations

1.5 WHEN the canvas renders the component tree THEN the system shows drop zones and children first, followed by the actual node content, inverting the DOM structure

#### 3. Silent API and Authentication Failures

1.6 WHEN API communication fails due to missing VITE_API_URL configuration THEN the system fails silently with no console logs or user-visible error messages

1.7 WHEN authentication setup fails in WorkspaceLayout.tsx THEN the system sets cryptoStatus to "error" with message "API unavailable" and never retries (lines 11-20)

1.8 WHEN users load the IDE with a misconfigured or unavailable API THEN the system becomes permanently stuck in error state with no recovery mechanism

1.9 WHEN crypto operations fail THEN the system swallows errors without logging or displaying actionable feedback to users

### Expected Behavior (Correct)

#### 1. Functional Publish Button

2.1 WHEN the user clicks the Publish button THEN the system SHALL call an async handlePublish function that sends a publish request to `/api/projects/:id/publish` endpoint

2.2 WHEN the publish request succeeds THEN the system SHALL display a success message with the published URL or deployment confirmation

2.3 WHEN the publish request fails THEN the system SHALL display a clear error message explaining what went wrong

#### 2. Correct Canvas Rendering (Parent-Before-Children)

2.4 WHEN AstRenderer renders a node with children in NodeWithDrops component THEN the system SHALL render the parent node first, followed by its children in proper hierarchical order

2.5 WHEN users drag and drop components THEN the system SHALL display the correct visual hierarchy matching the AST structure

2.6 WHEN the canvas renders the component tree THEN the system SHALL show each node followed by its children's drop zones and child nodes in proper nested order

#### 3. Robust Error Handling and Recovery

2.7 WHEN API communication fails THEN the system SHALL log detailed error information to the console and display user-friendly error messages

2.8 WHEN authentication setup fails in WorkspaceLayout.tsx THEN the system SHALL implement exponential backoff retry logic (e.g., retry after 1s, 2s, 4s, up to 3 attempts)

2.9 WHEN users load the IDE with a temporarily unavailable API THEN the system SHALL automatically retry the connection and recover when the API becomes available

2.10 WHEN crypto operations fail THEN the system SHALL log the error details to console and display actionable guidance (e.g., "Check that api-gateway is running on port 4000")

### Unchanged Behavior (Regression Prevention)

#### 1. Existing Publish Endpoint Functionality

3.1 WHEN the publish endpoint receives a valid request THEN the system SHALL CONTINUE TO validate authentication and publish intent as currently implemented

3.2 WHEN the publish endpoint processes a request THEN the system SHALL CONTINUE TO check nonces and user ownership as currently implemented

#### 2. Working Canvas Features

3.3 WHEN users save their project THEN the system SHALL CONTINUE TO encrypt and sync the AST using ML-KEM-768 + ML-DSA-65 as currently implemented

3.4 WHEN users load demo templates (Login/Blog) THEN the system SHALL CONTINUE TO populate the canvas correctly as currently implemented

3.5 WHEN users edit component properties THEN the system SHALL CONTINUE TO update the AST and re-render correctly as currently implemented

#### 3. PQC Cryptography Operations

3.6 WHEN users register their signing keys THEN the system SHALL CONTINUE TO use generateSignKeypair and registerSignPublicKey as currently implemented

3.7 WHEN the system performs ML-KEM key encapsulation THEN the system SHALL CONTINUE TO use the crypto-service on port 4081 as currently implemented

3.8 WHEN the system verifies signatures THEN the system SHALL CONTINUE TO use ML-DSA-65 verification as currently implemented

#### 4. Drag-and-Drop Mechanics

3.9 WHEN users drag components from the sidebar THEN the system SHALL CONTINUE TO use @dnd-kit functionality as currently implemented

3.10 WHEN drop zones become active THEN the system SHALL CONTINUE TO highlight with border-accent and bg-accent/20 as currently implemented
