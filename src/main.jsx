import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import JSZip from 'jszip';
import './styles.css';

const presets = {
  Web: { mode: 'longest', size: 1600, format: 'webp', quality: 82 },
  Thumbnail: { mode: 'fit', size: 640, format: 'webp', quality: 80 },
  Email: { mode: 'longest', size: 1600, format: 'jpeg', quality: 78 },
  'Modern web': { mode: 'longest', size: 2000, format: 'avif', quality: 70 },
};

const formatLabel = { original: 'Original', jpeg: 'JPEG', webp: 'WebP', avif: 'AVIF', png: 'PNG' };

function App() {
  const [files, setFiles] = useState([]);
  const [tab, setTab] = useState('Images');
  const [mode, setMode] = useState('longest');
  const [size, setSize] = useState(1600);
  const [format, setFormat] = useState('webp');
  const [quality, setQuality] = useState(82);
  const [removeMeta, setRemoveMeta] = useState(true);
  const [noUpscale, setNoUpscale] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(null);

  const totalBytes = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  const addFiles = (incoming) => {
    const images = [...incoming].filter((file) => file.type.startsWith('image/'));
    setFiles((current) => [...current, ...images.map((file) => ({ file, id: crypto.randomUUID(), status: 'ready' }))]);
    setDone(null);
  };

  const process = async () => {
    if (!files.length) return;
    setProcessing(true);
    const zip = new JSZip();
    let outputBytes = 0;
    const results = [];

    for (const item of files) {
      try {
        const bitmap = await createImageBitmap(item.file);
        const scale = mode === 'percentage' ? size / 100 : size / Math.max(bitmap.width, bitmap.height);
        const ratio = noUpscale ? Math.min(1, scale) : scale;
        const width = Math.max(1, Math.round(bitmap.width * ratio));
        const height = Math.max(1, Math.round(bitmap.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d', { alpha: true }).drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        const mime = format === 'original' ? item.file.type : `image/${format}`;
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality / 100));
        if (!blob) throw new Error(`Browser cannot encode ${formatLabel[format]}.`);
        const ext = format === 'original' ? (item.file.name.split('.').pop() || 'jpg') : format;
        const base = item.file.name.replace(/\.[^.]+$/, '');
        const outputName = `${base}-optimized.${ext}`;
        zip.file(outputName, blob);
        outputBytes += blob.size;
        results.push({ name: item.file.name, outputName, original: item.file.size, output: blob.size, width, height });
      } catch (error) {
        results.push({ name: item.file.name, error: error.message });
      }
    }

    const archive = await zip.generateAsync({ type: 'blob' });
    setDone({ results, outputBytes, archive });
    setProcessing(false);
  };

  const download = () => {
    if (!done?.archive) return;
    const url = URL.createObjectURL(done.archive);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'imagediet-optimized.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (name) => {
    const p = presets[name];
    setMode(p.mode); setSize(p.size); setFormat(p.format); setQuality(p.quality);
  };

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span className="mark">◒</span> ImageDiet</div>
        <nav>{['Images', 'Presets', 'About'].map((item) => <button className={tab === item ? 'active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</nav>
        <span className="local"><i /> Local processing</span>
      </header>

      {tab === 'Images' && <>
        <section className="hero">
          <p className="eyebrow">BULK IMAGE OPTIMIZATION</p>
          <h1>Make your images<br /><em>lighter.</em></h1>
          <p className="sub">Resize, compress and convert hundreds of images at once. Your files never leave your device.</p>
        </section>

        <section className="workspace">
          <label className="dropzone" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}>
            <input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} />
            <span className="dropicon">＋</span>
            <strong>Drop images here</strong>
            <span>or click to browse · JPG, PNG, WebP, AVIF</span>
          </label>

          {files.length > 0 && <div className="editor">
            <div className="filehead"><strong>{files.length} image{files.length > 1 ? 's' : ''} ready</strong><span>{formatBytes(totalBytes)} total</span><button onClick={() => { setFiles([]); setDone(null); }}>Clear</button></div>
            <div className="controls">
              <div className="control"><label>Resize</label><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="longest">Longest side</option><option value="width">Width</option><option value="height">Height</option><option value="percentage">Percentage</option></select><input type="number" min="1" value={size} onChange={(e) => setSize(Number(e.target.value))} /></div>
              <div className="control"><label>Output format</label><select value={format} onChange={(e) => setFormat(e.target.value)}>{Object.entries(formatLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
              <div className="control"><label>Quality <span>{quality}</span></label><input className="range" type="range" min="10" max="100" value={quality} onChange={(e) => setQuality(Number(e.target.value))} /></div>
              <div className="toggles"><label><input type="checkbox" checked={noUpscale} onChange={(e) => setNoUpscale(e.target.checked)} /> Don't enlarge smaller images</label><label><input type="checkbox" checked={removeMeta} onChange={(e) => setRemoveMeta(e.target.checked)} /> Strip metadata</label></div>
            </div>
            <div className="presets"><span>Quick preset</span>{Object.keys(presets).map((name) => <button key={name} onClick={() => applyPreset(name)}>{name}</button>)}</div>
            <div className="actions"><button className="primary" disabled={processing} onClick={process}>{processing ? 'Processing…' : `Optimize ${files.length} image${files.length > 1 ? 's' : ''}`}</button></div>
          </div>}

          {done && <section className="result"><div><p className="eyebrow">DONE</p><h2>Nice. Your images got lighter.</h2><p>{formatBytes(totalBytes)} → {formatBytes(done.outputBytes)} · <strong>{Math.max(0, Math.round((1 - done.outputBytes / totalBytes) * 100))}% smaller</strong></p></div><button className="primary" onClick={download}>Download ZIP</button></section>}
        </section>
      </>}

      {tab === 'Presets' && <section className="page"><p className="eyebrow">RECIPES</p><h2>Good defaults, ready to cook.</h2><p>Start with a preset, then tune the controls for your workflow.</p><div className="presetgrid">{Object.entries(presets).map(([name, p]) => <button key={name} onClick={() => { applyPreset(name); setTab('Images'); }}><strong>{name}</strong><span>{p.size}{p.mode === 'percentage' ? '%' : 'px'} · {formatLabel[p.format]} · Q{p.quality}</span></button>)}</div></section>}
      {tab === 'About' && <section className="page"><p className="eyebrow">ABOUT IMAGEDIET</p><h2>Your images stay yours.</h2><p>ImageDiet processes images inside your browser. There is no upload server, account, or image storage. It is designed for repetitive bulk work: drop a folder, create a recipe, and process everything in one pass.</p></section>}
    </main>
  );
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

createRoot(document.getElementById('root')).render(<App />);
