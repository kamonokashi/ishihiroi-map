import { ForestState } from './types';

export const GROWTH_THRESHOLDS = [0, 5, 15, 30, 60, 120, 240, 480];

export function growthStage(points: number): number {
  for (let i = GROWTH_THRESHOLDS.length - 1; i >= 0; i -= 1) {
    if (points >= GROWTH_THRESHOLDS[i]) {
      return i;
    }
  }
  return 0;
}

export function stageLabel(stage: number): string {
  const labels = [
    '何もない小さな地面',
    '小さな芽',
    '草が増える',
    '若木が生える',
    '木が育つ',
    '花が咲く',
    '小さな森になる',
    '森が豊かになる'
  ];
  return labels[Math.min(stage, labels.length - 1)];
}

export function addGrowthPoints(forest: ForestState, points: number): ForestState {
  return {
    ...forest,
    totalGrowthPoints: forest.totalGrowthPoints + Math.max(0, points)
  };
}

export function getProgressToNextStage(points: number): { stage: number; nextThreshold: number; progress: number } {
  const stage = growthStage(points);
  const nextThreshold = GROWTH_THRESHOLDS[Math.min(stage + 1, GROWTH_THRESHOLDS.length - 1)];
  const currentThreshold = GROWTH_THRESHOLDS[stage];
  const progress = nextThreshold === currentThreshold ? 1 : (points - currentThreshold) / (nextThreshold - currentThreshold);
  return { stage, nextThreshold, progress };
}
