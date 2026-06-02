import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Shield } from 'lucide-react';
import {
  LEGAL_DOCS,
  getLegalPath,
  type LegalDocType,
  type LegalDocument,
  type LegalSection,
} from '../../content/legalDocuments';

interface LegalDocumentPageProps {
  docType: LegalDocType;
}

const HIGHLIGHT_MS = 2800;

const LegalDocumentPage: React.FC<LegalDocumentPageProps> = ({ docType }) => {
  const doc: LegalDocument = LEGAL_DOCS[docType];
  const location = useLocation();
  const otherType: LegalDocType = docType === 'privacy' ? 'terms' : 'privacy';
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  const scrollToSection = useCallback((sectionId: string, behavior: ScrollBehavior = 'smooth') => {
    const el = document.getElementById(sectionId);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - 120;
    window.scrollTo({ top, behavior });
    setActiveSectionId(sectionId);
    setHighlightId(sectionId);
    window.setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
  }, []);

  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (!hash) return;
    const exists = doc.sections.some((s) => s.id === hash);
    if (!exists) return;
    const timer = window.setTimeout(() => scrollToSection(hash, 'smooth'), 120);
    return () => window.clearTimeout(timer);
  }, [location.hash, doc.sections, scrollToSection]);

  useEffect(() => {
    const onScroll = () => {
      const offset = 140;
      let current: string | null = doc.sections[0]?.id ?? null;
      for (const section of doc.sections) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= offset) {
          current = section.id;
        }
      }
      setActiveSectionId(current);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [doc.sections]);

  const renderSectionBody = (section: LegalSection) => (
    <>
      {section.paragraphs.map((p, i) => (
        <p
          key={i}
          className={`text-sm md:text-base leading-relaxed mb-4 last:mb-0 ${
            p === p.toUpperCase() && p.length > 80
              ? 'font-bold text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3'
              : 'text-gray-600'
          }`}
        >
          {p}
        </p>
      ))}
      {section.listItems && (
        <ul className="list-disc pl-5 space-y-2 mb-4 text-gray-600 text-sm md:text-base">
          {section.listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">
              {item}
            </li>
          ))}
        </ul>
      )}
      {section.table && (
        <div className="overflow-x-auto mb-4 rounded-2xl border border-gray-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50">
              <tr>
                {section.table.headers.map((h) => (
                  <th key={h} className="px-4 py-3 font-black text-gray-800 border-b border-gray-100">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-gray-50 last:border-0">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-3 text-gray-600 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {section.note && (
        <p className="text-sm font-bold text-gray-500 italic border-l-4 border-primary/40 pl-4">
          {section.note}
        </p>
      )}
      {section.link && (
        <a
          href={section.link.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 text-sm font-bold text-primary hover:underline"
        >
          {section.link.label}
        </a>
      )}
    </>
  );

  return (
    <div className="bg-[#f8faf8] min-h-[70vh] pb-20">
      <div className="bg-gradient-to-br from-[#5DBE61] to-[#3d9a44] text-white py-12 md:py-16 px-4">
        <div className="max-w-[1280px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            {docType === 'privacy' ? (
              <Shield className="size-8 shrink-0" />
            ) : (
              <FileText className="size-8 shrink-0" />
            )}
            <span className="text-xs font-black uppercase tracking-widest text-white/80">
              Nông Sản Xấu Mã
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase">{doc.title}</h1>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-green-50 font-medium">
            {doc.version && <span>{doc.version}</span>}
            <span>Ngày có hiệu lực: {doc.effectiveDate}</span>
            <span>Cập nhật lần cuối: {doc.updatedDate}</span>
          </div>
          <Link
            to={getLegalPath(otherType)}
            className="inline-block mt-6 text-sm font-black underline underline-offset-4 hover:text-white/90"
          >
            Xem {otherType === 'privacy' ? 'chính sách bảo mật' : 'điều khoản sử dụng'}
          </Link>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-10 xl:px-12 -mt-6">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10">
          <aside className="lg:w-72 shrink-0">
            <nav className="lg:sticky lg:top-28 bg-white rounded-[24px] border border-gray-100 shadow-sm p-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                Mục lục
              </p>
              <ul className="flex flex-col gap-1 max-h-[60vh] overflow-y-auto pr-1">
                {doc.sections.map((section) => {
                  const isActive = activeSectionId === section.id;
                  const isHighlight = highlightId === section.id;
                  return (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          window.history.replaceState(null, '', `${location.pathname}#${section.id}`);
                          scrollToSection(section.id);
                        }}
                        className={`block text-left text-xs font-bold rounded-xl px-3 py-2.5 transition-all duration-300 border ${
                          isHighlight
                            ? 'bg-primary/15 text-primary border-primary/40 shadow-md shadow-primary/10 scale-[1.02]'
                            : isActive
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'text-gray-600 border-transparent hover:bg-gray-50 hover:text-primary'
                        }`}
                      >
                        {section.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <article className="flex-1 min-w-0 space-y-6">
            {doc.sections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                className={`scroll-mt-28 bg-white rounded-[28px] border p-6 md:p-8 transition-all duration-500 ${
                  highlightId === section.id
                    ? 'border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/30'
                    : activeSectionId === section.id
                      ? 'border-primary/30 shadow-sm'
                      : 'border-gray-100 shadow-sm'
                }`}
              >
                <h2 className="text-lg md:text-xl font-black text-gray-900 mb-5 pb-3 border-b border-gray-100">
                  {section.title}
                </h2>
                {renderSectionBody(section)}
              </section>
            ))}
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalDocumentPage;
