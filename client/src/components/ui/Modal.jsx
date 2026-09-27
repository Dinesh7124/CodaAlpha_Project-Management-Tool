export default function Modal({ open, onClose, children, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className={"glass w-full " + width + " max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl animate-slide-up"}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
