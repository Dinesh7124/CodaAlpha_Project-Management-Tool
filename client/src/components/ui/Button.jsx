export default function Button({ children, variant = "primary", className = "", ...props }) {
  const base = { primary: "btn-primary", ghost: "btn-ghost", danger: "btn-danger" }[variant] || "";
  return (
    <button className={"btn " + base + " " + className} {...props}>
      {children}
    </button>
  );
}
