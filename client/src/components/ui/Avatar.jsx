function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
}

export default function Avatar({ name, color = "#6366f1", size = 32 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center text-white font-semibold shadow-sm flex-shrink-0"
      style={{ background: color, width: size, height: size, fontSize: size * 0.4 }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
