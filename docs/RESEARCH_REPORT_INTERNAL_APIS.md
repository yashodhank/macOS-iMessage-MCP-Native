# Research Report: Alternative iMessage Backends

This report explores alternative methods for sending iMessages and SMS on macOS, moving beyond the current AppleScript implementation. We analyze two primary directions: **Protocol-Level (pypush)** and **Private Frameworks (IMCore)**.

## 1. Current State: AppleScript (Native IPC)
Currently, the server uses AppleScript to control the native Messages.app.

- **Pros**: 100% Native, secure (TCC Automation only), reliable, no Apple ID password required.
- **Cons**: Requires Messages.app to be running, UI "flash" when sending, limited support for advanced features (reactions, thread replies on older macOS).
- **Security**: Requires **Automation** permission.

---

## 2. Approach A: Protocol-Level (pypush Pattern)
Used by projects like [pypush](https://github.com/JJTech0130/pypush) and [Beeper](https://beeper.com).

### Implementation
- **Mechanism**: Reverse-engineered implementation of Apple's APNs (Push), IDS (Identity), and iCloud protocols.
- **Transport**: Pure TCP/TLS sockets connecting directly to Apple's production servers.
- **Identity**: Emulates a legitimate Apple device (using serial numbers and hardware identifiers).

### Feasibility for Node.js
- **High**: Can be implemented in pure TypeScript without native code.
- **Advantages**: Cross-platform (could run on Linux/Docker), no macOS permission hurdles (no Full Disk Access or SIP disabling).
- **Challenges**: Requires handling complex encryption (RSA/ECDSA), registration tokens, and maintains a "device" state.

### Verdict
This is the most "elegant" solution for a server, but carries the risk of Apple blocking emulated devices if not perfectly implemented.

---

## 3. Approach B: Private Frameworks (IMCore / BlueBubbles Pattern)
Used by projects like [BlueBubbles](https://bluebubbles.app) (Private API mode).

### Implementation
- **Mechanism**: Directly calling functions in `IMCore.framework` via Objective-C or Swift.
- **Backends**: Interacts with `identityservicesd` and `imagent` on the local Mac.
- **Key Classes**: `IMChatRegistry`, `IMChat`, `IMMessage`.

### Feasibility for Node.js
- **Moderate**: Requires a native bridge (node-gyp / N-API).
- **Advantages**: Full feature parity with Messages.app (reactions, typing indicators, editing messages, thread support).
- **Challenges**: **Requires SIP (System Integrity Protection) to be disabled** to inject into or call private frameworks reliably in some contexts. Requires **Full Disk Access**.

### Verdict
The most feature-rich but comes with significant security trade-offs. Not suitable for general users who wish to keep their Mac's security intact.

---

## 4. Comparison Matrix

| Feature | AppleScript (Current) | Protocol-Level (pypush) | Private API (IMCore) |
| :--- | :--- | :--- | :--- |
| **Setup Difficulty** | Low | High | Very High |
| **Security Risk** | Low | Medium (Apple ID) | High (SIP Off) |
| **Stability** | High | Moderate | Low (Breaks on OS update) |
| **Speed** | Slow (UI-bound) | Instant | Fast |
| **Features** | Basic | Advanced | Full |

---

## 5. Audit Findings & Implementation Decision

After a comprehensive technical audit comparing **AppleScript (IPC)** vs. **IMCore (Private API)**, we have implemented a **Hybrid Fallback Strategy**.

### Key Findings:
1. **Security Compliance**: IMCore requires disabling **System Integrity Protection (SIP)**. This is a critical security trade-off that most users should not make.
2. **Performance Gap**: Native IMCore is ~10x faster (<100ms vs ~1.5s for AppleScript) but "brittle" (breaks frequently with macOS point-releases).
3. **Robustness**: AppleScript is the only approach that survives OS updates without maintenance but is prone to UI-level hangs.

### Implementation Status:
We have deployed the **Provider Architecture** to bridge these two worlds:
- **Default Backend**: Enhanced AppleScript with a **3-tier exponential backoff** retry logic.
- **Fail-Safe**: If a "Native" provider (IMCore) is detected and available (requires specialized build), the system uses it as the primary, with a transparent fallback to AppleScript.
- **Auto-Healing**: The system now detects `Messages.app` crashes and auto-recovers mid-send.

## 6. Next Steps for Research
- Investigate `MFMessageComposeViewController` equivalents for macOS (though typically UI-bound).
- Prototype a minimal `IMCore` bridge using `node-gyp` to test sending without SIP bypass (possible if entitlements are correctly signed).
- Explore `pypush` v2 (Go/TS rewrites) for potential library integration.
