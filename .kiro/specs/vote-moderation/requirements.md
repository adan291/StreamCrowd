# Requirements Document

## Introduction

This document specifies the requirements for a Vote Moderation System for TwitchVote Live. The system will provide streamers with tools to prevent vote manipulation, detect suspicious voting patterns, and maintain the integrity of live polls. This feature addresses the need for fair and trustworthy voting experiences in Twitch streams.

## Glossary

- **Vote_Moderation_System**: The component responsible for validating, filtering, and managing votes in real-time
- **Suspicious_Vote**: A vote that matches patterns associated with manipulation (rapid voting, new accounts, coordinated behavior)
- **Cooldown_Period**: A configurable time window during which a user cannot change their vote
- **Account_Age_Filter**: A filter that restricts voting to accounts older than a specified threshold
- **Vote_Weight**: A multiplier applied to votes based on user trust level (subscriber, follower, etc.)
- **Moderation_Log**: A record of all moderation actions taken during a poll
- **Trust_Level**: A classification of users based on their Twitch account attributes (subscriber, follower, account age)

## Requirements

### Requirement 1

**User Story:** As a streamer, I want to set minimum account age requirements for voters, so that I can prevent new bot accounts from manipulating poll results.

#### Acceptance Criteria

1. WHEN a streamer creates a poll THEN the Vote_Moderation_System SHALL display an option to set minimum account age in days
2. WHEN a user with an account younger than the configured threshold attempts to vote THEN the Vote_Moderation_System SHALL reject the vote silently
3. WHEN the account age filter is set to zero THEN the Vote_Moderation_System SHALL allow all accounts to vote regardless of age
4. WHEN a vote is rejected due to account age THEN the Vote_Moderation_System SHALL increment a counter for rejected votes

### Requirement 2

**User Story:** As a streamer, I want to give different vote weights to subscribers and followers, so that I can reward loyal community members with more influence.

#### Acceptance Criteria

1. WHEN a streamer configures vote weights THEN the Vote_Moderation_System SHALL accept weight values between 1 and 5 for each trust level
2. WHEN a subscriber votes THEN the Vote_Moderation_System SHALL apply the configured subscriber weight multiplier to their vote count
3. WHEN a follower votes THEN the Vote_Moderation_System SHALL apply the configured follower weight multiplier to their vote count
4. WHEN a non-follower votes THEN the Vote_Moderation_System SHALL apply a weight of 1 to their vote count
5. WHEN vote weights are applied THEN the Vote_Moderation_System SHALL display both raw vote counts and weighted totals

### Requirement 3

**User Story:** As a streamer, I want to see a log of moderation actions, so that I can review what votes were filtered and why.

#### Acceptance Criteria

1. WHEN a vote is rejected THEN the Vote_Moderation_System SHALL record the rejection reason, username, and timestamp in the Moderation_Log
2. WHEN a streamer opens the moderation panel THEN the Vote_Moderation_System SHALL display the most recent 100 log entries
3. WHEN the poll ends THEN the Vote_Moderation_System SHALL provide an option to export the Moderation_Log as CSV
4. WHEN displaying log entries THEN the Vote_Moderation_System SHALL group entries by rejection reason with counts

### Requirement 4

**User Story:** As a streamer, I want to enable a cooldown period for vote changes, so that users cannot rapidly switch votes to manipulate results.

#### Acceptance Criteria

1. WHEN a streamer creates a poll THEN the Vote_Moderation_System SHALL display an option to enable vote changing with a cooldown period
2. WHEN vote changing is enabled and a user attempts to change their vote before the cooldown expires THEN the Vote_Moderation_System SHALL reject the change and maintain the original vote
3. WHEN vote changing is disabled THEN the Vote_Moderation_System SHALL prevent any vote changes after the initial vote
4. WHEN a user successfully changes their vote THEN the Vote_Moderation_System SHALL update the vote counts by decrementing the old option and incrementing the new option

### Requirement 5

**User Story:** As a streamer, I want to see real-time statistics about vote moderation, so that I can understand how many votes are being filtered.

#### Acceptance Criteria

1. WHILE a poll is active THEN the Vote_Moderation_System SHALL display the count of total vote attempts
2. WHILE a poll is active THEN the Vote_Moderation_System SHALL display the count of rejected votes by category
3. WHILE a poll is active THEN the Vote_Moderation_System SHALL display the acceptance rate as a percentage
4. WHEN the acceptance rate falls below 50% THEN the Vote_Moderation_System SHALL display a warning indicator to the streamer

### Requirement 6

**User Story:** As a streamer, I want to save my moderation settings as presets, so that I can quickly apply consistent rules across different polls.

#### Acceptance Criteria

1. WHEN a streamer saves moderation settings THEN the Vote_Moderation_System SHALL store the configuration with a user-provided name
2. WHEN a streamer loads a preset THEN the Vote_Moderation_System SHALL apply all saved moderation settings to the current poll configuration
3. WHEN a streamer deletes a preset THEN the Vote_Moderation_System SHALL remove the configuration from storage
4. WHEN displaying presets THEN the Vote_Moderation_System SHALL show the preset name and a summary of key settings
