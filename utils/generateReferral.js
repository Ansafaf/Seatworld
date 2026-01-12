export function generateReferralCode(name) {
  return (
    name.slice(0, 3).toUpperCase() +
    Math.random().toString(36).substring(2, 8).toUpperCase()
  );
}
