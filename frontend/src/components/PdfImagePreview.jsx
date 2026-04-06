import { useEffect, useMemo, useState } from 'react';

function PdfImagePreview({ pdfUrl, maxPages = 3, showPageCounter = true }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [images, setImages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const renderedCount = useMemo(() => images.length, [images]);

  useEffect(() => {
    if (!pdfUrl) {
      setImages([]);
      setError('');
      setLoading(false);
      setTotalPages(0);
      return undefined;
    }

    let cancelled = false;
    let loadingTask = null;

    const renderPreview = async () => {
      setLoading(true);
      setError('');
      setImages([]);

      try {
        const [{ GlobalWorkerOptions, getDocument }, workerModule] = await Promise.all([
          import('pdfjs-dist'),
          import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
        ]);

        GlobalWorkerOptions.workerSrc = workerModule.default;

        const token = localStorage.getItem('token');
        const headers = {
          'X-Resume-Preview': '1',
        };

        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }

        const response = await fetch(pdfUrl, {
          credentials: 'include',
          headers,
        });

        if (!response.ok) {
          throw new Error(`Failed to load resume (${response.status})`);
        }

        const bytes = await response.arrayBuffer();
        loadingTask = getDocument({ data: bytes });
        const pdf = await loadingTask.promise;

        if (cancelled) return;

        setTotalPages(pdf.numPages);

        const numericMaxPages = Number(maxPages);
        const pageLimit =
          Number.isFinite(numericMaxPages) && numericMaxPages > 0
            ? Math.min(Math.floor(numericMaxPages), pdf.numPages)
            : pdf.numPages;
        const pageImages = [];

        for (let pageNumber = 1; pageNumber <= pageLimit; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d', { alpha: false });

          if (!context) {
            throw new Error('Canvas rendering is not supported in this browser');
          }

          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          if (cancelled) return;

          pageImages.push({
            pageNumber,
            src: canvas.toDataURL('image/png'),
          });
        }

        if (cancelled) return;
        setImages(pageImages);
      } catch (err) {
        if (cancelled) return;
        setError(err?.message || 'Unable to render resume preview');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    renderPreview();

    return () => {
      cancelled = true;
      if (loadingTask && typeof loadingTask.destroy === 'function') {
        loadingTask.destroy();
      }
    };
  }, [maxPages, pdfUrl]);

  if (!pdfUrl) {
    return (
      <p className="text-sm text-slate-500">Resume preview is not available.</p>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-slate-500">Rendering resume preview...</p>
        <div className="h-52 rounded-lg border border-slate-200 bg-slate-50 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <p className="text-sm text-amber-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showPageCounter && (
        <p className="text-xs text-slate-500">
          Showing {renderedCount} of {totalPages || renderedCount} page(s)
        </p>
      )}
      <div className="space-y-3">
        {images.map((image) => (
          <div
            key={`resume-page-${image.pageNumber}`}
            className="rounded-lg border border-slate-200 overflow-hidden bg-white"
          >
            <img
              src={image.src}
              alt={`Resume page ${image.pageNumber}`}
              className="w-full h-auto block"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default PdfImagePreview;
