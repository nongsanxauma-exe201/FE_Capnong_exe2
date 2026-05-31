/**
 * Chuẩn hóa chuỗi để tìm kiếm không phân biệt dấu/không dấu tiếng Việt.
 * Ví dụ: "Cà Rốt" → "ca rot", "ca rot" → "ca rot"
 */
export const normalizeSearch = (str: string): string => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // bỏ dấu tổ hợp (huyền, sắc, hỏi, ngã, nặng...)
    .replace(/đ/g, "d")         // đ → d
    .replace(/Đ/g, "d");        // Đ → d
};
