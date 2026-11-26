export type GuestEmotion = 'furious' | 'angry' | 'skeptical' | 'calm' | 'satisfied';

export type GuestGender = 'male' | 'female';

export type FacilityCategory = 'rooms' | 'fnb' | 'culinary' | 'convention' | 'pool' | 'rank';

export type VisualProfile =
  | 'rooms-male'
  | 'rooms-female'
  | 'rooms-noise'
  | 'rooms-vip'
  | 'fnb-delay'
  | 'fnb-corkage'
  | 'culinary-allergy'
  | 'culinary-grill'
  | 'convention-av'
  | 'convention-gala'
  | 'pool-rules'
  | 'pool-spa'
  | 'rank-intern'
  | 'rank-senior'
  | 'rank-manager'
  | 'rank-gm';

export type ScenarioId =
  | 'double-checkin'
  | 'dirty-room'
  | 'room-noise'
  | 'unreasonable-vip'
  | 'fnb-delay-order'
  | 'fnb-seat-corkage'
  | 'culinary-allergy'
  | 'culinary-undercooked'
  | 'convention-av-failure'
  | 'convention-catering-shortage'
  | 'pool-capacity-rules'
  | 'pool-hygiene-locker'
  | 'rank-intern-authority'
  | 'rank-senior-billing'
  | 'rank-manager-escalation'
  | 'rank-gm-crisis';

export type DifficultyLevel = '보통' | '어려움' | '매우 어려움';

export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';

export type SessionOutcome = 'ongoing' | 'resolved' | 'escalated';

export type TrainingMode = 'practice' | 'real';

export type ResponseSpeedMode = 'instant' | 'live-ai';

export interface CompetencyScores {
  empathy: number;       // 공감 및 경청
  apology: number;       // 사과 및 진정성
  sopCompliance: number; // 매뉴얼 준수
  composure: number;     // 침착성 및 어조
  resolution: number;    // 문제 해결 및 대안 제시
}

export type CompetencyKey = keyof CompetencyScores;

export interface FacilityCategoryMeta {
  id: FacilityCategory;
  label: string;
  shortLabel: string;
  staffRole: string;
  description: string;
}

export interface ScenarioDefinition {
  id: ScenarioId;
  facility: FacilityCategory;
  visualProfile: VisualProfile;
  title: string;
  shortTitle: string;
  category: string;
  difficulty: DifficultyLevel;
  guestName: string;
  guestRole: string;
  guestGender: GuestGender;
  roomInfo: string;
  initialSatisfaction: number;
  initialEmotion: GuestEmotion;
  maxTurns: number;
  summary: string;
  openingLine: string;
  guestPersonaPrompt: string;
  manualGuidelines: string[];
  recommendedPhrases: string[];
  quickStarters: { label: string; text: string }[];
}

export interface ChatTurn {
  id: string;
  speaker: 'guest' | 'trainee';
  text: string;
  timestamp: string;
  emotion?: GuestEmotion;
  satisfactionAfter?: number;
  satisfactionDelta?: number;
  coachingNote?: string;
  turnScores?: CompetencyScores;
}

export interface SessionReport {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  manualChecklist: { item: string; met: boolean }[];
  modelResponse: string;
  scores: CompetencyScores;
  overallScore: number;
}

export interface TrainingSessionRecord {
  id: string;
  scenarioId: ScenarioId;
  scenarioTitle: string;
  guestName: string;
  mode?: TrainingMode;
  completedAt: string;
  outcome: Exclude<SessionOutcome, 'ongoing'>;
  finalSatisfaction: number;
  overallScore: number;
  grade: Grade;
  xpEarned: number;
  turnCount: number;
  scores: CompetencyScores;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  manualChecklist: { item: string; met: boolean }[];
  modelResponse: string;
  transcript: ChatTurn[];
  isSeed?: boolean;
  misconductFailed?: boolean;
  inappropriateCount?: number;
}

export interface LevelProgress {
  level: number;
  title: string;
  currentXp: number;
  xpInCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  isMaxLevel: boolean;
}

export interface FacilityProgressStat {
  attempts: number;
  clearedScenarios: number;
  totalScenarios: number;
  averageScore: number;
}

export interface GrowthMetrics {
  totalSessions: number;
  resolvedCount: number;
  resolutionRate: number;
  averageScore: number;
  totalXp: number;
  averageCompetencies: CompetencyScores;
  strongestCompetency: { key: CompetencyKey; label: string; score: number };
  weakestCompetency: { key: CompetencyKey; label: string; score: number };
  scenarioBestScores: Record<ScenarioId, { bestScore: number; attempts: number; cleared: boolean }>;
  facilityStats: Record<FacilityCategory, FacilityProgressStat>;
  trend: { label: string; score: number; scenarioTitle: string; grade: Grade }[];
}

export interface TurnApiRequest {
  scenarioId: ScenarioId;
  traineeMessage: string;
  history: { speaker: 'guest' | 'trainee'; text: string }[];
  currentSatisfaction: number;
  turnNumber: number;
}

export interface TurnApiResponse {
  guestReply: string;
  emotion: GuestEmotion;
  satisfactionDelta: number;
  newSatisfaction: number;
  coachingNote: string;
  turnScores: CompetencyScores;
  shouldEnd: boolean;
  outcome: SessionOutcome;
  isInappropriateReply?: boolean;
  inappropriateReason?: string;
}

export interface ReportApiRequest {
  scenarioId: ScenarioId;
  history: { speaker: 'guest' | 'trainee'; text: string }[];
  finalSatisfaction: number;
  outcome: Exclude<SessionOutcome, 'ongoing'>;
  accumulatedScores: CompetencyScores;
}

export interface ReportApiResponse extends SessionReport {}
