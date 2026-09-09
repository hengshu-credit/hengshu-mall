// Start an independent read early, but only consume it if its parameters still match.
// The response is scoped to this load; subsequent refreshes always make a new request.
export default function prefetchRead(request, params) {
  const key = JSON.stringify(params);
  const pending = request(JSON.parse(key));
  // Its dependent request may fail first, leaving this read without a consumer.
  pending.catch(() => {});
  return (currentParams) => (JSON.stringify(currentParams) === key ? pending : request(currentParams));
}
