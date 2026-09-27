export default function ImagePreview({ url, filename, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[300] flex items-center justify-center p-8 animate-fade-in" onClick={onClose}>
      <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
        <img src={url} alt={filename} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
        <div className="absolute top-2 right-2 flex gap-2">
          <a href={url} download={filename} className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20">
            Download
          </a>
          <button onClick={onClose} className="glass px-3 py-1.5 rounded-lg text-white text-xs hover:bg-white/20">
            Close
          </button>
        </div>
        <p className="text-white/80 text-xs text-center mt-3">{filename}</p>
      </div>
    </div>
  );
}
