export default function Badge({ children, color = "#6366f1" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium inline-flex items-center"
      style={{ background: color + "22", color }}
    >
      {children}
    </span>
  );
}
