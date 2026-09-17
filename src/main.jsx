import JSZip from "jszip";
import { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const MAX_FILES = 500;
const formats = {
  original: "Original",
  jpeg: "JPEG",
  webp: "WebP",
  avif: "AVIF",
  png: "PNG",
};
const presets = {
  "Web optimized": {
    resizeMode: "longest",
    size: 1920,
    format: "webp",
    quality: 82,
    targetSize: "none",
  },
  Thumbnail: {
    resizeMode: "fit",
    size: 800,
    format: "webp",
    quality: 80,
    targetSize: "none",
  },
  Social: {
    resizeMode: "longest",
    size: 1080,
    format: "jpeg",
    quality: 85,
    targetSize: "none",
  },
  "Email friendly": {
    resizeMode: "longest",
    size: 1600,
    format: "jpeg",
    quality: 78,
    targetSize: "1000",
  },
  "Web assets": {
    resizeMode: "longest",
    size: 1600,
    format: "avif",
    quality: 65,
    targetSize: "none",
  },
};
const defaultRecipe = {
  resizeMode: "longest",
  size: 1600,
  format: "webp",
  quality: 82,
  targetSize: "none",
  fitMode: "contain",
  noUpscale: true,
  keepFolders: true,
  naming: "suffix",
  suffix: "-optimized",
};

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function imageFile(file) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|avif)$/i.test(file.name)
  );
}
function extensionFor(file, format) {
  return format === "original"
    ? file.name.split(".").pop() || "jpg"
    : format === "jpeg"
      ? "jpg"
      : format;
}
function dimensionsFor(width, height, recipe) {
  const target = Math.max(1, Number(recipe.size) || 1);
  let scale =
    recipe.resizeMode === "percentage"
      ? target / 100
      : target / Math.max(width, height);
  if (recipe.resizeMode === "width") scale = target / width;
  if (recipe.resizeMode === "height") scale = target / height;
  if (recipe.resizeMode === "fit")
    scale = Math.min(target / width, target / height);
  if (recipe.resizeMode === "both") return [target, target];
  if (recipe.noUpscale) scale = Math.min(1, scale);
  return [
    Math.max(1, Math.round(width * scale)),
    Math.max(1, Math.round(height * scale)),
  ];
}
function makeName(file, recipe, index) {
  const originalBase = file.name.replace(/\.[^.]+$/, "");
  const number = String(index).padStart(4, "0");
  let base =
    recipe.naming === "pattern"
      ? `image-${number}`
      : `${originalBase}${recipe.suffix}`;
  if (recipe.naming === "prefix")
    base = `${recipe.suffix || "image"}-${originalBase}`;
  return `${base.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9_-]/g, "")}.${extensionFor(file, recipe.format)}`;
}

async function encodeImage(file, recipe) {
  if (recipe.format === "original") return { blob: file, width: 0, height: 0 };
  const bitmap = await createImageBitmap(file);
  const [width, height] = dimensionsFor(bitmap.width, bitmap.height, recipe);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: recipe.format !== "jpeg" });
  if (recipe.format === "jpeg") {
    context.fillStyle = "#fff";
    context.fillRect(0, 0, width, height);
  }
  context.imageSmoothingQuality = "high";
  if (recipe.fitMode === "cover" || recipe.fitMode === "smart") {
    const scale = Math.max(width / bitmap.width, height / bitmap.height);
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    context.drawImage(
      bitmap,
      (bitmap.width - cropWidth) / 2,
      (bitmap.height - cropHeight) / 2,
      cropWidth,
      cropHeight,
      0,
      0,
      width,
      height,
    );
  } else context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const mime = `image/${recipe.format}`;
  let quality = recipe.quality / 100;
  let blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, mime, quality),
  );
  const limit =
    recipe.targetSize === "none" ? 0 : Number(recipe.targetSize) * 1024;
  while (blob && limit && blob.size > limit && quality > 0.35) {
    quality -= 0.08;
    blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    );
  }
  if (!blob || blob.type !== mime)
    throw new Error(
      `${formats[recipe.format]} encoding is not supported by this browser. Choose WebP or JPEG instead.`,
    );
  return { blob, width, height };
}

function App() {
  const inputRef = useRef(null);
  const folderRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [recipe, setRecipe] = useState(defaultRecipe);
  const [tab, setTab] = useState("Images");
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(null);
  const [error, setError] = useState("");
  const [stars, setStars] = useState(null);
  const totalBytes = useMemo(
    () => files.reduce((total, item) => total + item.file.size, 0),
    [files],
  );
  const estimatedBytes = Math.round(
    totalBytes *
      ({ webp: 0.19, avif: 0.14, jpeg: 0.28, png: 0.72, original: 1 }[
        recipe.format
      ] || 0.2),
  );
  const updateRecipe = (key, value) =>
    setRecipe((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    fetch("https://api.github.com/repos/mahmudnibir/ImageDiet")
      .then((response) => (response.ok ? response.json() : null))
      .then((repository) => repository && setStars(repository.stargazers_count))
      .catch(() => setStars(null));
  }, []);

  const addFiles = (incoming) => {
    const candidates = [...incoming].filter(imageFile);
    const unique = candidates.filter(
      (file) =>
        !files.some(
          (item) =>
            item.file.name === file.name && item.file.size === file.size,
        ),
    );
    const next = unique
      .slice(0, Math.max(0, MAX_FILES - files.length))
      .map((file) => ({
        file,
        id: crypto.randomUUID(),
        preview: URL.createObjectURL(file),
      }));
    if (!next.length) {
      setError(
        candidates.length
          ? `You can add up to ${MAX_FILES} unique images.`
          : "Please choose a JPG, PNG, WebP, or AVIF image.",
      );
      return;
    }
    setFiles((current) => [...current, ...next]);
    setDone(null);
    setError("");
  };
  const removeFile = (id) =>
    setFiles((current) => current.filter((item) => item.id !== id));
  const clearFiles = () => {
    files.forEach((item) => URL.revokeObjectURL(item.preview));
    setFiles([]);
    setDone(null);
  };
  const applyPreset = (name) =>
    setRecipe((current) => ({ ...current, ...presets[name] }));
  const handlePaste = (event) => {
    const pasted = [...(event.clipboardData?.items || [])]
      .map((item) => item.getAsFile())
      .filter(Boolean);
    if (pasted.length) addFiles(pasted);
  };

  const process = async () => {
    if (!files.length || processing) return;
    setProcessing(true);
    setProgress(0);
    setError("");
    const zip = new JSZip();
    const results = [];
    for (const [index, item] of files.entries()) {
      try {
        const encoded = await encodeImage(item.file, recipe);
        const relative = recipe.keepFolders
          ? item.file.webkitRelativePath?.replace(/^[^/]+\//, "") || ""
          : "";
        zip.file(
          `${relative}${makeName(item.file, recipe, index + 1)}`,
          encoded.blob,
        );
        results.push({
          name: item.file.name,
          output: encoded.blob.size,
          width: encoded.width,
          height: encoded.height,
        });
      } catch (processingError) {
        results.push({ name: item.file.name, error: processingError.message });
      }
      setProgress(Math.round(((index + 1) / files.length) * 100));
    }
    const archive = await zip.generateAsync({ type: "blob" });
    setDone({
      results,
      archive,
      outputBytes: results.reduce((sum, item) => sum + (item.output || 0), 0),
    });
    setProcessing(false);
  };
  const download = () => {
    if (!done?.archive) return;
    const url = URL.createObjectURL(done.archive);
    const link = document.createElement("a");
    link.href = url;
    link.download = "imagediet-optimized.zip";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <main onPaste={handlePaste}>
      <header className="topbar">
        <button className="brand" onClick={() => setTab("Images")}>
          <span className="mark">ID</span> ImageDiet
        </button>
        <nav>
          {["Images", "Presets", "About"].map((item) => (
            <button
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </nav>
        <a
          className="github-link"
          href="https://github.com/mahmudnibir/ImageDiet"
          target="_blank"
          rel="noreferrer"
        >
          <span aria-hidden="true">↗</span> GitHub
        </a>
      </header>
      {tab === "Images" && (
        <>
          <section className="hero">
            <p className="eyebrow">BULK IMAGE OPTIMIZATION</p>
            <h1>
              Make your images
              <br />
              <em>lighter.</em>
            </h1>
            <p className="sub">
              Resize, compress and convert hundreds of images at once. <span className="privacy-highlight">Your files never leave this device.</span>
            </p>
          </section>
          <section className="workspace">
            <div
              className={`dropzone ${dragging ? "dragging" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                addFiles(event.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                onChange={(event) => addFiles(event.target.files)}
              />
              <input
                ref={folderRef}
                className="hidden-input"
                type="file"
                accept="image/*"
                webkitdirectory="true"
                directory="true"
                multiple
                onChange={(event) => addFiles(event.target.files)}
              />
              <span className="dropicon">＋</span>
              <strong>Drop images here</strong>
              <span>or click to browse · JPG, PNG, WebP, AVIF</span>
              <button
                className="folder-button"
                onClick={(event) => {
                  event.stopPropagation();
                  folderRef.current?.click();
                }}
              >
                Choose folder
              </button>
              <small>Paste images with Ctrl + V</small>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {files.length > 0 && (
              <div className="editor">
                <div className="filehead">
                  <strong>
                    {files.length} image{files.length > 1 ? "s" : ""} ready
                  </strong>
                  <span>
                    {formatBytes(totalBytes)} total · rough estimate{" "}
                    {formatBytes(estimatedBytes)}
                  </span>
                  <button onClick={clearFiles}>Clear</button>
                </div>
                <div className="workspace-grid">
                  <div className="gallery-panel">
                    <div className="gallery-heading">
                      <span>THUMBNAILS</span>
                      <span>{files.length} selected</span>
                    </div>
                    <div className="file-list">
                      {files.map((item) => (
                        <div className="file-row" key={item.id}>
                          <img src={item.preview} alt="" />
                          <div>
                            <strong>{item.file.name}</strong>
                            <span>
                              {formatBytes(item.file.size)} ·{" "}
                              {item.file.type.split("/")[1]?.toUpperCase() ||
                                "IMAGE"}
                            </span>
                          </div>
                          <button
                            aria-label={`Remove ${item.file.name}`}
                            onClick={() => removeFile(item.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="gallery-tip">
                      Drop more images anywhere in this panel to add them to the
                      batch.
                    </div>
                  </div>
                  <aside className="recipe-panel">
                    <div className="recipe-title">
                      <div>
                        <p className="eyebrow">OPTIMIZATION RECIPE</p>
                        <h2>Configure once. Apply everywhere.</h2>
                      </div>
                      <span>
                        {recipe.format.toUpperCase()} · {recipe.quality} quality
                      </span>
                    </div>
                    <div className="controls">
                      <div className="control">
                        <label>
                          Resize by
                          <select
                            value={recipe.resizeMode}
                            onChange={(event) =>
                              updateRecipe("resizeMode", event.target.value)
                            }
                          >
                            <option value="longest">Longest side</option>
                            <option value="width">Width</option>
                            <option value="height">Height</option>
                            <option value="both">Both dimensions</option>
                            <option value="fit">Fit inside</option>
                            <option value="percentage">Percentage</option>
                          </select>
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={recipe.size}
                          onChange={(event) =>
                            updateRecipe("size", Number(event.target.value))
                          }
                        />
                      </div>
                      <div className="control">
                        <label>
                          Fit mode
                          <select
                            value={recipe.fitMode}
                            onChange={(event) =>
                              updateRecipe("fitMode", event.target.value)
                            }
                          >
                            <option value="contain">Contain</option>
                            <option value="cover">Cover / crop</option>
                            <option value="stretch">Stretch</option>
                            <option value="smart">Smart crop</option>
                          </select>
                        </label>
                      </div>
                      <div className="control">
                        <label>
                          Output format
                          <select
                            value={recipe.format}
                            onChange={(event) =>
                              updateRecipe("format", event.target.value)
                            }
                          >
                            {Object.entries(formats).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="control">
                        <label>
                          Quality <span>{recipe.quality}</span>
                        </label>
                        <input
                          className="range"
                          type="range"
                          min="10"
                          max="100"
                          value={recipe.quality}
                          onChange={(event) =>
                            updateRecipe("quality", Number(event.target.value))
                          }
                        />
                      </div>
                    </div>
                    <div className="setting-notes" aria-label="Recipe setting guidance">
                      <div><strong>Resize</strong><span>Changes pixel dimensions. Smaller dimensions usually mean much smaller files.</span></div>
                      <div><strong>Fit mode</strong><span>Contain keeps the whole image. Cover crops to fill. Stretch changes proportions.</span></div>
                      <div><strong>Format</strong><span>WebP and AVIF are compact. JPEG is widely compatible. PNG is lossless and can be larger.</span></div>
                      <div><strong>Quality</strong><span>Higher keeps more detail but creates larger files. Start around 75–85.</span></div>
                    </div>
                    <div className="advanced-grid">
                      <label>
                        Target size
                        <select
                          value={recipe.targetSize}
                          onChange={(event) =>
                            updateRecipe("targetSize", event.target.value)
                          }
                        >
                          <option value="none">No limit</option>
                          <option value="1000">Under 1 MB</option>
                          <option value="500">Under 500 KB</option>
                          <option value="250">Under 250 KB</option>
                        </select>
                      </label>
                      <label>
                        Naming
                        <select
                          value={recipe.naming}
                          onChange={(event) =>
                            updateRecipe("naming", event.target.value)
                          }
                        >
                          <option value="suffix">Original + suffix</option>
                          <option value="prefix">Add prefix</option>
                          <option value="pattern">Custom numbering</option>
                        </select>
                      </label>
                      {recipe.naming !== "pattern" && (
                        <label>
                          Suffix / prefix
                          <input
                            type="text"
                            value={recipe.suffix}
                            onChange={(event) =>
                              updateRecipe("suffix", event.target.value)
                            }
                          />
                        </label>
                      )}
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={recipe.noUpscale}
                          onChange={(event) =>
                            updateRecipe("noUpscale", event.target.checked)
                          }
                        />{" "}
                        Don't enlarge smaller images
                      </label>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={recipe.keepFolders}
                          onChange={(event) =>
                            updateRecipe("keepFolders", event.target.checked)
                          }
                        />{" "}
                        Keep folder structure
                      </label>
                    </div>
                    <div className="presets">
                      <span>Quick preset</span>
                      {Object.keys(presets).map((name) => (
                        <button key={name} onClick={() => applyPreset(name)}>
                          {name}
                        </button>
                      ))}
                    </div>
                    <div className="actions">
                      {processing && (
                        <span className="progress">Processing {progress}%</span>
                      )}
                      <button
                        className="primary"
                        disabled={processing}
                        onClick={process}
                      >
                        {processing
                          ? "Processing…"
                          : `Optimize ${files.length} image${files.length > 1 ? "s" : ""}`}
                      </button>
                    </div>
                  </aside>
                </div>
              </div>
            )}
            {done && (
              <section className="result">
                <div>
                  <p className="eyebrow">DONE</p>
                  <h2>
                    {done.outputBytes <= totalBytes
                      ? "Nice. Your images got lighter."
                      : "This recipe made them larger."}
                  </h2>
                  <p>
                    {formatBytes(totalBytes)} → {formatBytes(done.outputBytes)}{" "}
                    ·{" "}
                    <strong>
                      {totalBytes
                        ? Math.abs(
                            Math.round(
                              (1 - done.outputBytes / totalBytes) * 100,
                            ),
                          )
                        : 0}
                      % {done.outputBytes <= totalBytes ? "smaller" : "larger"}
                    </strong>
                  </p>
                  <small>
                    {done.results.filter((item) => item.error).length
                      ? `${done.results.filter((item) => item.error).length} file(s) could not be processed.`
                      : `${done.results.length} file(s) processed successfully.`}
                  </small>
                </div>
                <button className="primary" onClick={download}>
                  Download ZIP
                </button>
              </section>
            )}
          </section>
        </>
      )}
      {tab === "Presets" && (
        <section className="page">
          <p className="eyebrow">RECIPES</p>
          <h2>Good defaults, ready to cook.</h2>
          <p>Pick a preset, then tune it on the Images screen.</p>
          <div className="presetgrid">
            {Object.entries(presets).map(([name, preset]) => (
              <button
                key={name}
                onClick={() => {
                  applyPreset(name);
                  setTab("Images");
                }}
              >
                <strong>{name}</strong>
                <span>
                  {preset.size}px · {formats[preset.format]} · Q{preset.quality}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
      {tab === "About" && (
        <section className="page">
          <p className="eyebrow">ABOUT IMAGEDIET</p>
          <h2>Less weight. More control.</h2>
          <p>ImageDiet is an open-source bulk image optimizer for the repetitive work between a camera roll and a finished website.</p>
          <div className="info-grid">
            <article><span className="info-index">01</span><h3>Local by design</h3><p>Images are decoded, resized, converted, and zipped in your browser. There is no upload server, account, or image storage.</p></article>
            <article><span className="info-index">02</span><h3>Recipes, not busywork</h3><p>Set one resize, format, quality, naming, and metadata recipe, then apply it to up to 500 images in one pass.</p></article>
            <article><span className="info-index">03</span><h3>Made for batches</h3><p>Drop files, choose a folder, paste from your clipboard, preserve folder structure, and download one organized ZIP.</p></article>
            <article><span className="info-index">04</span><h3>Open source</h3><p>Inspect the code, suggest improvements, or contribute on GitHub. ImageDiet is built by Nibir for practical image work.</p></article>
          </div>
          <a className="page-link" href="https://github.com/mahmudnibir/ImageDiet" target="_blank" rel="noreferrer">Explore the source on GitHub <span aria-hidden="true">↗</span></a>
        </section>
      )}
      {tab === "Privacy" && (
        <section className="page privacy-page">
          <p className="eyebrow">PRIVACY</p>
          <h2>Your files never leave this device.</h2>
          <p>ImageDiet is designed so image processing happens locally in your browser instead of on a remote server.</p>
          <div className="privacy-list">
            <div><strong>What stays local</strong><span>Your images, thumbnails, recipes, and generated ZIP files stay in this browser session and on your device.</span></div>
            <div><strong>What we do not collect</strong><span>There is no ImageDiet account, image upload, image archive, or personal image database.</span></div>
            <div><strong>One external request</strong><span>The footer can request the public GitHub repository star count. It never includes your files or image metadata.</span></div>
            <div><strong>Your control</strong><span>Close the tab or clear the batch at any time. Generated files are only downloaded when you choose Download ZIP.</span></div>
          </div>
        </section>
      )}
      <footer className="site-footer">
        <div className="footer-brand"><span className="mark">ID</span><strong>ImageDiet</strong><span>Private image work, locally.</span></div>
        <nav className="footer-links" aria-label="Footer links">
          <button onClick={() => setTab("Privacy")}>Privacy</button>
          <button onClick={() => setTab("About")}>About</button>
          <a href="https://github.com/mahmudnibir/ImageDiet" target="_blank" rel="noreferrer">View on GitHub</a>
          <a href="https://github.com/mahmudnibir" target="_blank" rel="noreferrer">Developed by Nibir</a>
          <a className="star-link" href="https://github.com/mahmudnibir/ImageDiet" target="_blank" rel="noreferrer"><span aria-hidden="true">★</span> {stars === null ? "Star on GitHub" : `${stars} stars`}</a>
        </nav>
      </footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
