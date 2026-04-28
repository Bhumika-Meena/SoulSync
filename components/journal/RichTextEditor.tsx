"use client";

import { useState, useRef, useEffect } from "react";

type RichTextEditorProps = {
  initialContent?: string;
  backgroundImage?: string | null;
  onSave: (content: string, backgroundImage: string | null) => void;
  onCancel: () => void;
};

export function RichTextEditor({
  initialContent = "",
  backgroundImage: initialBgImage = null,
  onSave,
  onCancel,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(initialBgImage);
  const [showFontMenu, setShowFontMenu] = useState(false);
  const [showColorMenu, setShowColorMenu] = useState(false);

  const fonts = [
    { name: "Default", value: "" },
    { name: "Serif", value: "Georgia, serif" },
    { name: "Sans Serif", value: "Arial, sans-serif" },
    { name: "Monospace", value: "Courier New, monospace" },
    { name: "Cursive", value: "Brush Script MT, cursive" },
  ];

  const colors = [
    "#2d3748", "#4a5568", "#718096", "#a0aec0",
    "#e53e3e", "#dd6b20", "#d69e2e", "#38a169",
    "#319795", "#3182ce", "#5a67d8", "#805ad5",
    "#d53f8c", "#ed64a6",
  ];

  useEffect(() => {
    if (editorRef.current && initialContent) {
      editorRef.current.innerHTML = initialContent;
    }
  }, [initialContent]);

  function execCommand(cmd: string, value?: string) {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setBackgroundImage(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  }

  function handleSave() {
    const content = editorRef.current?.innerHTML || "";
    onSave(content, backgroundImage);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="soul-surface p-3 rounded-2xl flex flex-wrap items-center gap-2">
        {/* Font Selection */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowFontMenu(!showFontMenu)}
            className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text text-sm font-medium hover:bg-white transition-gentle"
          >
            Font ▼
          </button>
          {showFontMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg p-2 z-10 min-w-[150px]">
              {fonts.map((font) => (
                <button
                  key={font.value}
                  type="button"
                  onClick={() => {
                    execCommand("fontName", font.value || "Arial");
                    setShowFontMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-soul-card text-sm transition-gentle"
                  style={{ fontFamily: font.value || "inherit" }}
                >
                  {font.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Text Formatting */}
        <button
          type="button"
          onClick={() => execCommand("bold")}
          className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text font-bold hover:bg-white transition-gentle"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => execCommand("italic")}
          className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text italic hover:bg-white transition-gentle"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => execCommand("underline")}
          className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text underline hover:bg-white transition-gentle"
          title="Underline"
        >
          U
        </button>

        {/* Color Selection */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorMenu(!showColorMenu)}
            className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text text-sm font-medium hover:bg-white transition-gentle"
          >
            Color ▼
          </button>
          {showColorMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg p-3 z-10">
              <div className="grid grid-cols-4 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      execCommand("foreColor", color);
                      setShowColorMenu(false);
                    }}
                    className="w-8 h-8 rounded-lg border-2 border-soul-primary-text/20 hover:scale-110 transition-gentle"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Background Image */}
        <label className="px-3 py-1.5 rounded-xl bg-white/80 text-soul-primary-text text-sm font-medium hover:bg-white transition-gentle cursor-pointer">
          📷 Background
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>

        {backgroundImage && (
          <button
            type="button"
            onClick={() => setBackgroundImage(null)}
            className="px-3 py-1.5 rounded-xl bg-red-100 text-red-700 text-sm font-medium hover:bg-red-200 transition-gentle"
          >
            Remove Image
          </button>
        )}
      </div>

      {/* Editor */}
      <div
        className="rich-editor"
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          minHeight: "400px",
        }}
        onInput={() => {
          // Keep editor focused for formatting
        }}
      />

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={handleSave}
          className="soul-btn-primary px-6 py-3 rounded-2xl font-medium"
        >
          Save Entry
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-3 rounded-2xl font-medium border-2 border-soul-primary text-soul-primary hover:bg-soul-primary/10 transition-gentle"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
