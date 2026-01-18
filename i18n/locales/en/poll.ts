/**
 * English (EN) Poll Translations
 * 
 * Poll/voting translations for interactive polling functionality.
 * 
 * @see REQ-1.1: Traducciones divididas en archivos por dominio
 * @see REQ-1.2: Cada archivo de traducción no debe exceder 500 líneas
 * @see REQ-3.2: Traducciones de features cargadas bajo demanda
 */

import type { PollTranslations } from '../../types';

/**
 * Poll English translations
 * Contains all translations related to polls, voting, and survey functionality
 */
export const poll: PollTranslations = {
  // Basic poll UI
  title: 'Poll',
  liveTitle: 'Live Poll',
  createTitle: 'Create Poll',
  question: 'Question',
  questionPlaceholder: 'What\'s your question?',
  options: 'Options',
  optionPlaceholder: 'Option',
  
  // Actions
  addOption: 'Add option',
  removeOption: 'Remove option',
  create: 'Create Poll',
  stop: 'Stop',
  reset: 'Reset',
  
  // Status
  active: 'Active',
  ended: 'Ended',
  totalVotes: 'Total votes',
  votes: 'votes',
  votesLabel: 'votes',
  winner: 'Winner',
  viewDetails: 'View Details',
  ofTotal: 'of total',
  noVotes: 'No votes yet',
  waitingPoll: 'Waiting for poll...',
  createPollHint: 'Create a poll in the main panel',
  
  // Configuration
  duration: 'Duration',
  maxVotes: 'Vote limit',
  unlimited: 'Unlimited',
  seconds: 'seconds',
  minutes: 'minutes',
  timeRemaining: 'Time remaining',
  voteWith: 'Vote by typing',
  
  // Overlay settings
  openOverlay: 'Open Overlay',
  copyOverlayUrl: 'Copy Overlay URL',
  urlCopied: 'URL copied to clipboard',
  
  // Confirmation and preview
  confirm: 'Confirm Poll',
  confirmHint: 'Review details before launching.',
  preview: 'Preview',
  save: 'Save',
  saveTemplate: 'Save as Template',
  apply: 'Apply',
  cancel: 'Cancel',
  
  // Goal settings
  goal: 'Goal',
  goalTooltip: 'Stops when reaching X votes',
  
  // Validation messages
  writeQuestion: 'Write a question to save.',
  minOptions: 'Poll must have at least 2 options.',
  storageFull: 'Could not save: Storage limit exceeded.',
  templateSaved: 'Template saved successfully.',
  replaceOptions: 'This will replace current options. Do you want to continue?',
  noPollActive: 'No active poll',
  createInPanel: 'Create a poll in the Panel to see preview.',
  shareVotes: '{label}: {percentage}% of votes',
  
  // OBS integration
  obsOverlay: 'OBS Overlay',
  obsHint: 'Show the poll in your stream with Window Capture.',
  
  // Quick poll
  quick: 'Quick',
  yesNo: 'Yes / No',
  
  // Section and question labels
  sectionTitle: 'Section Title',
  sectionTitleTooltip: "Appears above the question (e.g., 'Voting Now')",
  questionLabel: 'Question',
  questionTooltip: 'The main question for viewers',
  questionPlaceholderFull: 'What should we play today?',
  
  // Response options
  responseOptions: 'Response Options',
  addOptionBtn: 'Add Option',
  
  // Time and colors
  timeSec: 'Time (Sec)',
  barColor: 'Bar',
  limitColor: 'Limit',
  
  // Vote prefix settings
  votePrefix: 'Prefix',
  votePrefixTooltip: 'Symbol to vote (e.g., +1, !1, #1)',
  voteKeyTooltip: 'Keyword to vote (e.g., yes, no, red)',
  
  // Match mode
  matchMode: 'Mode',
  matchModeTooltip: 'Exact: must match exactly. Partial: can be within the message.',
  matchExact: 'Exact',
  matchPartial: 'Partial',
  
  // Poll actions
  startPoll: 'Start Poll',
  clearForm: 'Clear Form',
  
  // Templates
  templates: 'Templates',
  myTemplates: 'My Templates',
  favorites: 'Favorites',
  
  // Image upload
  uploadImage: 'Upload Image',
  galleryBtn: 'Gallery',
  
  // Feedback messages
  presetApplied: 'Preset applied.',
  templateLoaded: 'Template loaded.',
  
  // Image validation errors
  invalidImageType: 'File must be a valid image (JPG, PNG, GIF).',
  imageTooLarge: 'Image is too large (Max 40MB).',
  fileReadError: 'Error reading file. Try again.',
  iconSavedToGallery: 'Icon processed and saved to Gallery.',
  imageProcessError: 'Error processing image in browser.',
  imageDamaged: 'The image file appears to be damaged.',
  
  // Option validation
  needTwoOptions: 'At least 2 options are needed.',
  completeAllFields: 'Complete the question and all options.',
  allOptionsNeedLabel: 'All options must have a label.',
  option: 'Option',
  
  // Import options
  noOptionsToImport: 'No options to import',
  optionsImported: 'options imported',
  
  // Quick poll creation
  quickPollCreated: 'Quick Yes/No poll created!',
  
  // Spinner/raffle integration
  spinnerWheel: 'Spinner',
  randomWinnerTooltip: 'Draw a winner among viewers',
  raffle: 'Raffle',
};

export default poll;