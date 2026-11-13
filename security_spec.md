# Security Specification - SplitJoy

## Data Invariants
1. A user can only read and write their own profile document (`/users/{userId}`).
2. Group expense subcollection documents (`/groups/{groupId}/expenses/{expenseId}`) can only be read, created, updated, or deleted by verified members or the owner of `/groups/{groupId}`.
3. Group metadata (`/groups/{groupId}`) uses high-entropy random IDs (12+ chars) and can only be listed by existing members (`isMemberOrOwner`).
4. Joining a group via invite code (`Scenario B`) can only append the authenticated user (`request.auth.uid`) to `memberIds` and `members` without removing existing members or modifying `ownerId`, `name`, `currency`, `createdAt`, `id`, or `expenses`.
5. Only the owner of a group (`ownerId`) can delete it.
6. All document IDs, strings, numbers, and arrays are strictly bounded in type, keys (`hasOnly`), and size.

## The "Dirty Dozen" Payloads (Test Scenarios)
1. **Unauthorized User Read**: Authenticated user attempts to read another user's profile. (Expected: DENIED)
2. **Unauthorized User Write**: Authenticated user attempts to write to another user's profile. (Expected: DENIED)
3. **Non-Member Group List**: Authenticated user attempts to list groups they are not a member of. (Expected: DENIED)
4. **Non-Member Expense Read/Write**: Authenticated user with only `groupId` attempts to read or write `/groups/{groupId}/expenses/{expenseId}` before joining. (Expected: DENIED)
5. **Non-Member Member-Removal Attack (Join Hijack)**: User B attempts to join via Scenario B while removing existing member User A from `memberIds` or `members`. (Expected: DENIED)
6. **Non-Owner Group Delete**: A member (not owner) attempts to delete a group. (Expected: DENIED)
7. **Anonymous Group/Expense Write**: Unauthenticated user attempts to create a group or expense. (Expected: DENIED)
8. **Malicious Document ID**: Attempting to create a document with a 2KB ID or invalid characters. (Expected: DENIED via `isValidId`)
9. **Owner Spoofing**: User A attempts to create a group with `ownerId` set to User B, or change `ownerId` on update. (Expected: DENIED)
10. **Private Path Access**: Attempting to access `/_admin_data/config`. (Expected: DENIED)
11. **Shadow Field Injection**: Adding `isAdmin: true` to `/users/{userId}`, `/groups/{groupId}`, or `/groups/{groupId}/expenses/{expenseId}`. (Expected: DENIED via `hasOnly`)
12. **Resource Poisoning**: Updating a group name, currency, or expense description with an oversized string or negative amount. (Expected: DENIED via size/value checks)
