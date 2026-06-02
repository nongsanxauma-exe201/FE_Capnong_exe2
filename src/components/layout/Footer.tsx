import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, Facebook, MapPin } from 'lucide-react';
import { FOOTER_LINK_GROUPS } from '../../content/footerLinks';
import { getLegalPath } from '../../content/legalDocuments';

const footerLinkClass = 'hover:text-white transition-colors font-medium block';

const Footer: React.FC = () => {
  const containerClass = 'w-full max-w-[1280px] mx-auto';
  const outerPaddingClass = 'px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12';

  return (
    <footer className={`bg-[#5DBE61] text-white py-16 ${outerPaddingClass} mt-12 w-full`}>
      <div className={`${containerClass} grid grid-cols-1 md:grid-cols-3 gap-12`}>
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="size-14 rounded-full" />
            <div>
              <h2 className="text-xl font-black tracking-tight">Nông Sản</h2>
              <p className="text-sm font-bold">Xấu Mã</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              className="w-11 h-11 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center"
              title="Facebook"
            >
              <Facebook className="size-5" />
            </button>
            <button
              type="button"
              className="w-11 h-11 bg-blue-600 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center font-black text-sm"
              title="TikTok"
            >
              <img
                src="https://cdn.simpleicons.org/tiktok/white"
                alt="TikTok"
                className="size-4"
              />
            </button>
            <button
              type="button"
              className="w-11 h-11 bg-blue-600 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center justify-center font-black text-sm"
              title="Zalo"
            >
              Z
            </button>
          </div>

          <div className="flex flex-col gap-2 text-sm text-green-50">
            <span className="flex items-center gap-2 font-medium">
              <Phone className="size-4 shrink-0" /> 0913 135 603
            </span>
            <a
              href="mailto:nongsanxauma@gmail.com"
              className="flex items-center gap-2 hover:text-white transition-colors"
            >
              <Mail className="size-4 shrink-0" /> nongsanxauma@gmail.com
            </a>
            <span className="flex items-start gap-2">
              <MapPin className="size-4 mt-0.5 shrink-0" />
              <span className="text-xs">
                Hẻm C21, đường 449, Lê Văn Việt, Phường Tăng Nhơn Phú A, TP HCM
              </span>
            </span>
          </div>
        </div>

        {FOOTER_LINK_GROUPS.map((group) => (
          <div key={group.title} className="flex flex-col gap-6">
            <h5 className="font-black text-white uppercase tracking-wider text-sm">
              {group.title}
            </h5>
            <ul className="flex flex-col gap-3 text-sm text-green-50">
              {group.links.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className={footerLinkClass}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div
        className={`${containerClass} mt-12 pt-8 border-t border-white/20 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-green-100 font-medium`}
      >
        <p>Copyright © 2026 by Nông Sản Xấu Mã. All rights reserved</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link className="hover:text-white underline" to={getLegalPath('terms')}>
            Điều khoản sử dụng
          </Link>
          <span aria-hidden>|</span>
          <Link className="hover:text-white underline" to={getLegalPath('privacy')}>
            Chính sách bảo mật
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
