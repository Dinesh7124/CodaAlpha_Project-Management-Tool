import { useState, useRef, useEffect } from "react";
import Avatar from "../ui/Avatar.jsx";

export default function MentionInput({ value, onChange, onSubmit, placeholder, members }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [query, setQuery] = useState("");
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    const lastAt = value.lastIndexOf("@");
    if (lastAt >= 0 && lastAt === value.length - 1 - query.length) {
      const q = value.slice(lastAt + 1);
      setQuery(q);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [value]);

  const filtered = members?.filter((m) =>
    m.user.name.toLowerCase().includes(query.toLowerCase())
  ) || [];

  const insertMention = (user) => {
    const lastAt = value.lastIndexOf("@");
    const before = value.slice(0, lastAt);
    const newVal = before + "@" + user.name.replace(/s+/g, "_") + " ";
    onChange(newVal);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder || "Comment... (type @ to mention)"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !showSuggestions) onSubmit(e); }}
      />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute bottom-full mb-2 left-0 glass rounded-lg p-1 w-64 shadow-xl max-h-40 overflow-y-auto z-30">
          {filtered.slice(0, 6).map((m) => (
            <button
              key={m.user.id}
              onClick={() => insertMention(m.user)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
            >
              <Avatar name={m.user.name} color={m.user.avatarColor} size={24} />
              <span className="text-sm">{m.user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
