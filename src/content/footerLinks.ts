import { LEGAL_DOCS, getLegalPath, type LegalDocType, type LegalSection } from './legalDocuments';

export type FooterLinkItem = {
  label: string;
  to: string;
};

export type FooterLinkGroup = {
  title: string;
  links: FooterLinkItem[];
};

const stripSectionNumber = (title: string) => title.replace(/^\d+\.\s*/, '');

const FOOTER_SHORT_LABELS: Partial<Record<string, string>> = {
  'gioi-thieu': 'Giới thiệu',
  'dat-hang-thanh-toan': 'Đặt hàng & thanh toán',
  'giao-hang-nhan-hang': 'Giao hàng',
  'doi-tra-hoan-tien': 'Đổi trả & hoàn tiền',
  'cap-nhat-lien-he': 'Liên hệ',
  'thu-thap-du-lieu': 'Thu thập dữ liệu',
  'quyen-nguoi-dung': 'Quyền của bạn',
  'lien-he': 'Liên hệ',
};

const FOOTER_HIGHLIGHT_IDS: Record<LegalDocType, string[]> = {
  terms: [
    'gioi-thieu',
    'dat-hang-thanh-toan',
    'giao-hang-nhan-hang',
    'doi-tra-hoan-tien',
    'cap-nhat-lien-he',
  ],
  privacy: ['gioi-thieu', 'thu-thap-du-lieu', 'quyen-nguoi-dung', 'lien-he'],
};

function sectionLabel(type: LegalDocType, section: LegalSection): string {
  if (FOOTER_SHORT_LABELS[section.id]) return FOOTER_SHORT_LABELS[section.id]!;
  const raw = type === 'terms' ? stripSectionNumber(section.title) : section.title;
  return raw.length > 36 ? `${raw.slice(0, 34)}…` : raw;
}

function buildDocFooterGroup(type: LegalDocType): FooterLinkGroup {
  const doc = LEGAL_DOCS[type];
  const path = getLegalPath(type);
  const highlights = FOOTER_HIGHLIGHT_IDS[type]
    .map((id) => doc.sections.find((s) => s.id === id))
    .filter((s): s is LegalSection => Boolean(s));

  return {
    title: doc.title,
    links: highlights.map((section) => ({
      label: sectionLabel(type, section),
      to: `${path}#${section.id}`,
    })),
  };
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  buildDocFooterGroup('terms'),
  buildDocFooterGroup('privacy'),
];
