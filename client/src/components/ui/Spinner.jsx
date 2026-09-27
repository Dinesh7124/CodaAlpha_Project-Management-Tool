export default function Spinner({ size = 24 }) {
  return (
    <div
      className="animate-spin rounded-full border-2 border-slate-300 dark:border-slate-600 border-t-indigo-600"
      style={{ width: size, height: size }}
    />
  );
}
