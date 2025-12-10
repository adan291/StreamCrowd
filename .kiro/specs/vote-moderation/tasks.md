# Implementation Plan

- [x] 1. Set up project structure and core types





  - Create `services/voteModerationService.ts` with type definitions
  - Define ModerationConfig, VoteValidationResult, RejectionReason, ModerationLogEntry, ModerationStats interfaces
  - Export types from `types.ts`
  - _Requirements: 1.1, 2.1, 3.1, 5.1_

- [x] 2. Implement VoteValidator component





  - [x] 2.1 Create account age filter function


    - Implement `validateAccountAge(accountAgeDays: number, minAge: number): boolean`
    - Handle edge case where minAge = 0 (allow all)
    - _Requirements: 1.2, 1.3_
  - [x] 2.2 Write property test for account age filtering



    - **Property 1: Account age filtering correctness**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 2.3 Create cooldown filter function


    - Implement `validateCooldown(lastVoteTime: number, cooldownSeconds: number, currentTime: number): boolean`
    - _Requirements: 4.2_
  - [x] 2.4 Write property test for cooldown enforcement



    - **Property 9: Cooldown enforcement**
    - **Validates: Requirements 4.2**
  - [x] 2.5 Create vote change validator function


    - Implement `canChangeVote(hasVoted: boolean, voteChangeEnabled: boolean): boolean`
    - _Requirements: 4.3_
  - [x] 2.6 Write property test for vote change prevention



    - **Property 10: Vote change prevention when disabled**
    - **Validates: Requirements 4.3**
  - [x] 2.7 Create main validateVote function


    - Combine all filters into single validation pipeline
    - Return VoteValidationResult with rejection reason if invalid
    - _Requirements: 1.2, 4.2, 4.3_


- [x] 3. Implement WeightCalculator component




  - [x] 3.1 Create weight validation function


    - Implement `isValidWeight(weight: number): boolean` for range 1-5
    - _Requirements: 2.1_
  - [x] 3.2 Write property test for weight bounds validation



    - **Property 3: Vote weight bounds validation**
    - **Validates: Requirements 2.1**
  - [x] 3.3 Create weight calculation function


    - Implement `calculateWeight(isSubscriber: boolean, isFollower: boolean, config: ModerationConfig): number`
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 3.4 Write property test for weight calculation


    - **Property 4: Vote weight calculation correctness**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  - [x] 3.5 Create weighted totals calculator


    - Implement `calculateWeightedTotal(votes: VoteRecord[], weights: Map<string, number>): number`
    - _Requirements: 2.5_
  - [x] 3.6 Write property test for weighted totals



    - **Property 5: Weighted totals display accuracy**
    - **Validates: Requirements 2.5**


- [x] 4. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ModerationLogger component





  - [x] 5.1 Create log entry creation function


    - Implement `createLogEntry(username: string, userId: string, action: string, reason?: RejectionReason, optionId: number, weight: number): ModerationLogEntry`
    - _Requirements: 3.1_

  - [x] 5.2 Write property test for log entry completeness


    - **Property 6: Log entry completeness**
    - **Validates: Requirements 3.1**
  - [x] 5.3 Create log storage functions


    - Implement `addLogEntry(pollId: string, entry: ModerationLogEntry): void`
    - Implement `getLogEntries(pollId: string, limit?: number): ModerationLogEntry[]`
    - _Requirements: 3.2_
  - [x] 5.4 Write property test for log display limit



    - **Property 7: Log display limit**
    - **Validates: Requirements 3.2**
  - [x] 5.5 Create log grouping function


    - Implement `groupLogByReason(entries: ModerationLogEntry[]): Record<RejectionReason, number>`
    - _Requirements: 3.4_
  - [x] 5.6 Write property test for log grouping



    - **Property 8: Log grouping correctness**
    - **Validates: Requirements 3.4**
  - [x] 5.7 Create CSV export function


    - Implement `exportLogToCSV(entries: ModerationLogEntry[]): string`
    - _Requirements: 3.3_

- [x] 6. Implement StatisticsCollector component





  - [x] 6.1 Create statistics tracking functions


    - Implement `updateStats(stats: ModerationStats, isAccepted: boolean, reason?: RejectionReason): ModerationStats`
    - Implement `calculateAcceptanceRate(stats: ModerationStats): number`
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 6.2 Write property test for statistics accuracy


    - **Property 12: Statistics accuracy**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  - [x] 6.3 Create warning threshold checker

    - Implement `shouldShowWarning(acceptanceRate: number): boolean`
    - _Requirements: 5.4_
  - [x] 6.4 Write property test for warning threshold


    - **Property 13: Warning threshold trigger**
    - **Validates: Requirements 5.4**


- [x] 7. Implement vote change logic




  - [x] 7.1 Create vote change handler


    - Implement `handleVoteChange(poll: ModeratedPoll, userId: string, oldOptionId: number, newOptionId: number, weight: number): ModeratedPoll`
    - Update vote counts correctly (decrement old, increment new)
    - _Requirements: 4.4_
  - [x] 7.2 Write property test for vote change count invariant



    - **Property 11: Vote change count invariant**
    - **Validates: Requirements 4.4**
  - [x] 7.3 Write property test for rejection counter invariant



    - **Property 2: Rejection counter invariant**
    - **Validates: Requirements 1.4**


- [x] 8. Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement PresetManager component





  - [x] 9.1 Create preset CRUD functions


    - Implement `savePreset(name: string, config: ModerationConfig): ModerationPreset`
    - Implement `loadPreset(id: string): ModerationPreset | null`
    - Implement `deletePreset(id: string): boolean`
    - Implement `getAllPresets(): ModerationPreset[]`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 9.2 Write property test for preset round-trip


    - **Property 14: Preset round-trip consistency**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 9.3 Write property test for preset deletion



    - **Property 15: Preset deletion completeness**
    - **Validates: Requirements 6.3**
  - [x] 9.4 Create preset display formatter


    - Implement `formatPresetSummary(preset: ModerationPreset): string`
    - _Requirements: 6.4_

  - [x] 9.5 Write property test for preset display


    - **Property 16: Preset display completeness**
    - **Validates: Requirements 6.4**

- [x] 10. Create ModerationPanel UI component





  - [x] 10.1 Create ModerationConfig form component


    - Build form with account age input, vote change toggle, cooldown input, weight sliders
    - Add preset save/load buttons
    - _Requirements: 1.1, 4.1, 6.4_
  - [x] 10.2 Create ModerationStats display component


    - Show total attempts, accepted, rejected by category
    - Display acceptance rate with warning indicator when < 50%
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 10.3 Create ModerationLog viewer component

    - Display log entries with grouping by reason
    - Add CSV export button
    - _Requirements: 3.2, 3.3, 3.4_


- [x] 11. Integrate moderation into existing vote flow




  - [x] 11.1 Update App.tsx to include moderation state


    - Add moderationConfig, moderationStats, moderationLog to state
    - Pass moderation props to PollCreator and LivePoll
    - _Requirements: 1.1, 5.1_
  - [x] 11.2 Update vote processing in message handler


    - Call validateVote before counting vote
    - Apply weight calculation to accepted votes
    - Update statistics on each vote attempt
    - Log rejected votes
    - _Requirements: 1.2, 2.2, 3.1, 5.1_
  - [x] 11.3 Update PollCreator to include moderation options


    - Add ModerationConfig form section
    - Integrate preset loading
    - _Requirements: 1.1, 4.1, 6.2_
  - [x] 11.4 Update LivePoll to show weighted totals


    - Display both raw and weighted vote counts
    - Show moderation statistics panel
    - _Requirements: 2.5, 5.1_


- [x] 12. Final Checkpoint - Ensure all tests pass




  - Ensure all tests pass, ask the user if questions arise.
