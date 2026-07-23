export function computeUnifiedSurveyInsights({
  analytics,
  responses = [],
} = {}) {
  const totalRecipients = Number(
    analytics?.totalRecipients || analytics?.overview?.totalRecipients || 0
  );
  const totalResponses = Number(
    analytics?.totalResponses || analytics?.overview?.totalResponses || 0
  );
  const completionRate = Number(
    analytics?.completionRate || analytics?.overview?.completionRate || 0
  );
  const avgCompletionTimeSec = Number(
    analytics?.avgCompletionTime || analytics?.overview?.avgCompletionTime || 0
  );
  const dropOffRate = Number(
    analytics?.dropOffRate || analytics?.overview?.dropOffRate || 0
  );
  const lastResponseAt =
    analytics?.lastResponseAt ||
    analytics?.overview?.lastResponseAt ||
    analytics?.recentActivity?.[0]?.submittedAt ||
    null;

  return {
    totalRecipients,
    totalResponses,
    completedResponses: totalResponses,
    completionRate,
    avgCompletionTimeSec,
    dropOffRate,
    lastResponseAt,
  };
}

export function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}
