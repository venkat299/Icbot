export type InteractiveQuestionType = 'code' | 'multiple-select' | 'yes-no'; // Describes supported interactive question kinds.

export interface InteractiveQuestionBase { // Provides shared fields for interactive questions.
  id: string;
  type: InteractiveQuestionType;
  prompt?: string;
}

export interface CodeInteractiveQuestion extends InteractiveQuestionBase { // Captures metadata for code submissions.
  type: 'code';
  language?: string | null;
  initialCode?: string | null;
  debugMode?: boolean;
}

export interface MultipleSelectInteractiveQuestion extends InteractiveQuestionBase { // Captures metadata for multi-select submissions.
  type: 'multiple-select';
  options: string[];
}

export interface YesNoInteractiveQuestion extends InteractiveQuestionBase { // Captures metadata for yes/no prompts.
  type: 'yes-no';
}

export type InteractiveQuestionData =
  | CodeInteractiveQuestion
  | MultipleSelectInteractiveQuestion
  | YesNoInteractiveQuestion; // Enumerates interactive question payload variants.

export type InteractiveQuestionAnswer =
  | { type: 'code'; code: string; language?: string | null }
  | { type: 'multiple-select'; answers: string[] }
  | { type: 'yes-no'; answer: 'yes' | 'no' | null }; // Describes interactive question response payloads.
