# Security Specification - SplitJoy

## Data Invariants
1. A user can only read and write their own profile document (`/users/{userId}`).
2. A group can only be read by its members.
3. A group can only be modified (update members/expenses) by its members.
4. Only the owner of a group (`ownerId`) can delete it.
5. All IDs must be valid strings and reasonably sized.
6. Timestamps should ideally be server-managed but we use ISO strings locally for now; we'll enforce basic string type.

## The "Dirty Dozen" Payloads (Test Scenarios)
1. **Unauthorized User Read**: Authenticated user attempts to read another user's profile. (Expected: DENIED)
2. **Unauthorized User Write**: Authenticated user attempts to write to another user's profile. (Expected: DENIED)
3. **Non-Member Group Read**: Authenticated user attempts to read a group they are not a member of. (Expected: DENIED)
4. **Non-Member Group Update**: Authenticated user attempts to add an expense to a group they are not in. (Expected: DENIED)
5. **Non-Owner Group Delete**: A member (not owner) attempts to delete a group. (Expected: DENIED)
6. **Anonymous Group Write**: Unauthenticated user attempts to create a group. (Expected: DENIED)
7. **Malicious Document ID**: Attempting to create a document with a 2KB ID. (Expected: DENIED via size limits)
8. **Owner Spoofing**: User A attempts to create a group but sets `ownerId` to User B. (Expected: DENIED)
9. **Private Path Access**: Attempting to access `/_admin_data/config`. (Expected: DENIED)
10. **Shadow Field Injection**: Adding `isAdmin: true` to a user profile update. (Expected: DENIED via future schema hardening)
11. **Empty Member List**: Creating a group with no members. (Expected: DENIED via validation)
12. **Foreign Currency Attack**: Updating a group's currency to an extremely long string. (Expected: DENIED)

## Implementation Plan
- Use `request.auth.uid` for identity.
- Use `get()` in rules to check group membership for group updates.
- Use `request.resource.data` to validate document shape on creation.
