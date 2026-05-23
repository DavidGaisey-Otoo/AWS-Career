import { useEffect } from 'react';
import { useRoadmap } from '../../context/RoadmapContext.jsx';
import { fireConfetti, sideCannons } from '../ui/Confetti.js';

/**
 * Listens for phase completion in RoadmapContext and triggers
 * confetti + side cannons exactly once per occurrence.
 */
export function RoadmapEffects() {
  const { phaseJustCompleted, consumePhaseJustCompleted } = useRoadmap();
  useEffect(() => {
    if (!phaseJustCompleted) return;
    sideCannons();
    setTimeout(fireConfetti, 200);
    consumePhaseJustCompleted();
  }, [phaseJustCompleted, consumePhaseJustCompleted]);
  return null;
}
