import { useEffect, useMemo, useState } from 'react';
import { GrowthDashboard } from './components/GrowthDashboard';
import { HomeStage } from './components/HomeStage';
import { LobbyStage } from './components/LobbyStage';
import { ManualDrawer } from './components/ManualDrawer';
import { SimulationStage } from './components/SimulationStage';
import { getScenarioById, isValidScenarioId } from './data/hotelManual';
import { aggregateGrowthMetrics, calculateLevelFromXp } from './utils/gameLogic';
import {
  appendTrainingSession,
  loadTrainingSessions,
  resetTrainingSessions,
  restoreSeedSessions,
} from './utils/storage';
import type { FacilityCategory, ScenarioId, TrainingMode, TrainingSessionRecord } from './types';

type AppView = 'home' | 'lobby' | 'simulation' | 'dashboard';

function getInitialView(): {
  view: AppView;
  scenarioId: ScenarioId;
  mode: TrainingMode;
  facility: FacilityCategory | null;
} {
  if (typeof window === 'undefined') {
    return { view: 'home', scenarioId: 'double-checkin', mode: 'practice', facility: null };
  }
  const params = new URLSearchParams(window.location.search);
  const autostart = params.get('autostart') === '1';
  const viewParam = params.get('view');
  const modeParam = params.get('mode');
  const mode: TrainingMode = modeParam === 'real' ? 'real' : 'practice';
  const scenarioParam = params.get('scenario');
  const validScenario: ScenarioId = isValidScenarioId(scenarioParam)
    ? scenarioParam
    : 'double-checkin';

  if (autostart) {
    return {
      view: 'simulation',
      scenarioId: validScenario,
      mode,
      facility: getScenarioById(validScenario).facility,
    };
  }
  if (viewParam === 'dashboard') {
    return { view: 'dashboard', scenarioId: validScenario, mode, facility: null };
  }
  if (viewParam === 'lobby') {
    return { view: 'lobby', scenarioId: validScenario, mode, facility: null };
  }
  return { view: 'home', scenarioId: validScenario, mode, facility: null };
}

export default function App() {
  const initial = useMemo(() => getInitialView(), []);
  const [view, setView] = useState<AppView>(initial.view);
  const [selectedFacility, setSelectedFacility] = useState<FacilityCategory | null>(
    initial.facility
  );
  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>(initial.scenarioId);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>(initial.mode);
  const [sessions, setSessions] = useState<TrainingSessionRecord[]>(() =>
    loadTrainingSessions()
  );
  const [manualOpen, setManualOpen] = useState<boolean>(false);

  const metrics = useMemo(() => aggregateGrowthMetrics(sessions), [sessions]);
  const levelProgress = useMemo(
    () => calculateLevelFromXp(metrics.totalXp),
    [metrics.totalXp]
  );

  useEffect(() => {
    document.body.dataset.state =
      view === 'simulation'
        ? 'playing'
        : view === 'home'
          ? 'home'
          : view === 'lobby'
            ? 'title'
            : 'dashboard';
  }, [view]);

  function handleEnterCategories() {
    setSelectedFacility(null);
    setView('lobby');
    window.scrollTo({ top: 0 });
  }

  function handleStartScenario(id: ScenarioId, modeOverride?: TrainingMode) {
    setSelectedScenarioId(id);
    setSelectedFacility(getScenarioById(id).facility);
    if (modeOverride) {
      setTrainingMode(modeOverride);
    }
    setManualOpen(false);
    setView('simulation');
    document.body.dataset.state = 'playing';
  }

  function handleSessionCompleted(record: TrainingSessionRecord) {
    setSessions((prev) => appendTrainingSession(prev, record));
  }

  const activeScenario = getScenarioById(selectedScenarioId);

  return (
    <>
      {view === 'home' && <HomeStage onStart={handleEnterCategories} />}

      {view === 'lobby' && (
        <LobbyStage
          levelProgress={levelProgress}
          metrics={metrics}
          selectedFacility={selectedFacility}
          selectedScenarioId={selectedScenarioId}
          trainingMode={trainingMode}
          onChangeMode={setTrainingMode}
          onSelectFacility={setSelectedFacility}
          onSelectScenario={setSelectedScenarioId}
          onStartScenario={handleStartScenario}
          onBackToHome={() => {
            setView('home');
            window.scrollTo({ top: 0 });
          }}
          onOpenDashboard={() => setView('dashboard')}
          onOpenManual={() => setManualOpen(true)}
        />
      )}

      {view === 'simulation' && (
        <SimulationStage
          scenario={activeScenario}
          mode={trainingMode}
          currentTotalXp={metrics.totalXp}
          onSessionCompleted={handleSessionCompleted}
          onSwitchToRealMode={() => handleStartScenario(selectedScenarioId, 'real')}
          onOpenManual={() => setManualOpen(true)}
          onOpenDashboard={() => setView('dashboard')}
          onBackToLobby={() => setView('lobby')}
        />
      )}

      {view === 'dashboard' && (
        <GrowthDashboard
          sessions={sessions}
          metrics={metrics}
          levelProgress={levelProgress}
          onStartScenario={(id) => handleStartScenario(id)}
          onBackToLobby={() => {
            setSelectedFacility(null);
            setView('lobby');
            window.scrollTo({ top: 0 });
          }}
          onOpenRankScenarios={() => {
            setSelectedFacility('rank');
            setView('lobby');
            window.scrollTo({ top: 0 });
          }}
          onOpenManual={() => setManualOpen(true)}
          onResetSessions={() => setSessions(resetTrainingSessions())}
          onRestoreSeed={() => setSessions(restoreSeedSessions())}
        />
      )}

      <ManualDrawer
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        initialScenarioId={view === 'simulation' ? selectedScenarioId : undefined}
      />
    </>
  );
}
