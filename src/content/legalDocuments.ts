export type LegalDocType = 'privacy' | 'terms';

export interface LegalSection {
  id: string;
  title: string;
  paragraphs: string[];
  listItems?: string[];
  table?: { headers: string[]; rows: string[][] };
  note?: string;
  link?: { href: string; label: string };
}

export interface LegalDocument {
  type: LegalDocType;
  title: string;
  effectiveDate: string;
  updatedDate: string;
  version?: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  type: 'privacy',
  title: 'Chính sách bảo mật thông tin',
  effectiveDate: '02/06/2026',
  updatedDate: '02/06/2026',
  sections: [
    {
      id: 'gioi-thieu',
      title: 'Giới thiệu',
      paragraphs: [
        'Chào mừng bạn đến với nền tảng nongsanxauma.vn (bao gồm website và ứng dụng di động). Nông Sản Xấu Mã nghiêm túc thực hiện trách nhiệm của mình liên quan đến bảo mật thông tin theo các quy định về bảo vệ bí mật thông tin cá nhân của pháp luật Việt Nam (“Luật riêng tư”) và cam kết tôn trọng quyền riêng tư và sự quan tâm của tất cả người dùng đối với website và ứng dụng di động của chúng tôi (“Nền tảng”) (chúng tôi gọi chung Các Nền tảng và các dịch vụ chúng tôi cung cấp như được mô tả trong Nền tảng của chúng tôi là "các Dịch Vụ").',
        'Người dùng có nghĩa là người đăng ký tài khoản với chúng tôi để sử dụng các Dịch Vụ, bao gồm cả người mua và người bán (gọi chung và gọi riêng là “Các Người Dùng”, “bạn” hoặc “của bạn”). Chúng tôi nhận biết tầm quan trọng của dữ liệu cá nhân mà bạn đã tin tưởng giao cho chúng tôi và tin rằng chúng tôi có trách nhiệm quản lý, bảo vệ và xử lý dữ liệu cá nhân của bạn một cách thích hợp.',
        'Chính sách bảo mật này ("Chính sách bảo mật" hay "Chính sách") được thiết kế để giúp bạn hiểu được cách thức chúng tôi thu thập, sử dụng, tiết lộ và/hoặc xử lý dữ liệu cá nhân mà bạn đã cung cấp cho chúng tôi và/hoặc lưu giữ về bạn, cho dù là hiện nay hoặc trong tương lai, cũng như để giúp bạn đưa ra quyết định sáng suốt trước khi cung cấp cho chúng tôi bất kỳ dữ liệu cá nhân nào của bạn.',
        'Bằng việc sử dụng Các Dịch Vụ, đăng ký một tài khoản với chúng tôi hoặc truy cập Nền tảng, bạn xác nhận và đồng ý rằng bạn chấp nhận các phương pháp, yêu cầu, và/hoặc chính sách được mô tả trong Chính sách bảo mật này, và theo đây bạn xác nhận bạn đã biết rõ và đồng ý toàn bộ cho phép chúng tôi thu thập, sử dụng, tiết lộ và/hoặc xử lý dữ liệu cá nhân của bạn như mô tả trong đây.',
        'NẾU BẠN KHÔNG ĐỒNG Ý CHO PHÉP XỬ LÝ DỮ LIỆU CÁ NHÂN CỦA BẠN NHƯ MÔ TẢ TRONG CHÍNH SÁCH NÀY, VUI LÒNG KHÔNG SỬ DỤNG CÁC DỊCH VỤ CỦA CHÚNG TÔI HAY TRUY CẬP NỀN TẢNG HOẶC TRANG WEB CỦA CHÚNG TÔI.',
      ],
    },
    {
      id: 'thu-thap-du-lieu',
      title: 'Những loại thông tin được thu thập và mục đích sử dụng',
      paragraphs: [
        'Để kết nối hiệu quả nguồn nông sản từ các nhà cung cấp đến tay người tiêu dùng, chúng tôi thu thập các nhóm dữ liệu sau:',
        'Dành cho Người tiêu dùng: Họ tên, số điện thoại, địa chỉ nhận hàng, địa chỉ email, và lịch sử giao dịch. Dữ liệu này bắt buộc để xử lý đơn hàng, giao trái cây/rau củ đến đúng địa chỉ và giải quyết khiếu nại.',
        'Dành cho Nông dân & Siêu thị (Đối tác cung cấp): Tên, địa chỉ lấy hàng, số điện thoại, thông tin tài khoản thanh toán và các giấy tờ chứng nhận (nếu có) để phục vụ việc đối soát và thanh toán định kỳ.',
      ],
    },
    {
      id: 'luu-tru-dang-nhap',
      title: 'Chính sách lưu trữ dữ liệu đăng nhập',
      paragraphs: [
        'Nông Sản Xấu Mã có thể sử dụng cơ chế lưu trữ cục bộ trên trình duyệt hoặc thiết bị của người dùng để lưu một số thông tin cần thiết nhằm duy trì phiên đăng nhập, chẳng hạn như token xác thực hoặc thông tin trạng thái đăng nhập.',
        'Việc lưu trữ này giúp người dùng không cần đăng nhập lại liên tục trong quá trình sử dụng website hoặc ứng dụng. Ngoài ra, trong thời gian ứng dụng đang hoạt động, hệ thống có thể tạm thời lưu trạng thái đăng nhập trong bộ nhớ để đảm bảo trải nghiệm sử dụng ổn định.',
        'Quyền lựa chọn: Người dùng có thể xóa dữ liệu lưu trữ cục bộ thông qua phần cài đặt của trình duyệt, thiết bị hoặc bằng cách đăng xuất khỏi tài khoản. Khi dữ liệu này bị xóa, người dùng có thể bị đăng xuất và cần đăng nhập lại để tiếp tục sử dụng các chức năng yêu cầu tài khoản.',
      ],
    },
    {
      id: 'chia-se-du-lieu',
      title: 'Các trường hợp chia sẻ và tiết lộ dữ liệu',
      paragraphs: [
        'Chúng tôi cam kết tuyệt đối không bán thông tin cá nhân của bạn cho bên thứ ba vì mục đích thương mại. Dữ liệu chỉ được chia sẻ trong các tình huống sau:',
      ],
      listItems: [
        'Đối tác vận chuyển và Thanh toán: Chia sẻ các thông tin tối thiểu (tên, địa chỉ, số điện thoại, số tiền) để tài xế giao hàng và cổng thanh toán hoàn tất giao dịch.',
        'Dịch vụ phân tích: Chúng tôi có thể sử dụng các công cụ như Google Analytics để phân tích hiệu suất ứng dụng. Bạn có thể chọn từ chối việc thu thập dữ liệu này trong phần "Cài đặt tài khoản".',
        'Yêu cầu pháp lý: Chúng tôi buộc phải cung cấp dữ liệu nếu có lệnh của tòa án hoặc yêu cầu hợp pháp từ cơ quan nhà nước có thẩm quyền.',
      ],
    },
    {
      id: 'quyen-nguoi-dung',
      title: 'Quyền xem xét và sửa đổi thông tin của người dùng',
      paragraphs: ['Người dùng hoàn toàn làm chủ dữ liệu của mình trên Nông Sản Xấu Mã. Tại mục "Hồ sơ của tôi", bạn có quyền:'],
      listItems: [
        'Truy cập, xem lại, thay đổi hoặc cập nhật thông tin cá nhân bất cứ lúc nào.',
        'Lựa chọn từ chối nhận các email hoặc thông báo quảng cáo.',
        'Yêu cầu xóa toàn bộ dữ liệu cá nhân và đóng tài khoản vĩnh viễn.',
      ],
    },
    {
      id: 'chuyen-nhuong',
      title: 'Điều khoản chuyển nhượng kinh doanh',
      paragraphs: [
        'Trong trường hợp Nông Sản Xấu Mã thực hiện sáp nhập, mua lại, hoặc bán lại toàn bộ hay một phần tài sản cho một công ty khác, thông tin cá nhân của người dùng sẽ nằm trong khối tài sản được chuyển giao. Chúng tôi sẽ thông báo trước cho bạn qua email hoặc thông báo trên ứng dụng để bạn có quyền quyết định duy trì hoặc xóa tài khoản trước khi quá trình chuyển giao hoàn tất.',
      ],
    },
    {
      id: 'do-tuoi',
      title: 'Yêu cầu về độ tuổi',
      paragraphs: [
        'Nền tảng Nông Sản Xấu Mã không chủ đích thu thập thông tin từ trẻ em dưới 16 tuổi. Bằng việc sử dụng ứng dụng, bạn xác nhận mình đã đủ 18 tuổi trở lên. Nếu chúng tôi phát hiện đã thu thập dữ liệu từ trẻ em dưới 16 tuổi mà không có sự đồng ý hợp lệ từ phụ huynh, chúng tôi sẽ tiến hành xóa dữ liệu đó ngay lập tức.',
      ],
    },
    {
      id: 'bao-mat-an-toan',
      title: 'Cam kết bảo mật an toàn dữ liệu',
      paragraphs: [
        'Dữ liệu của bạn được lưu trữ trên các máy chủ bảo mật, sử dụng công nghệ mã hóa hiện đại và được giới hạn quyền truy cập nội bộ (chỉ những nhân sự có thẩm quyền mới được tiếp cận). Mặc dù chúng tôi nỗ lực tối đa, người dùng cũng cần tự bảo vệ thông tin bằng cách giữ kín mật khẩu đăng nhập.',
      ],
    },
    {
      id: 'lien-he',
      title: 'Thông tin liên hệ về quyền riêng tư',
      paragraphs: [
        'Nếu bạn có bất kỳ lo ngại hoặc thắc mắc nào về chính sách này, vui lòng liên hệ trực tiếp với người phụ trách bảo mật dữ liệu của chúng tôi:',
        'Email: nongsanxauma@gmail.com',
        'Điện thoại: 0913135603',
        'Địa chỉ: Hẻm C21, đường 449, Lê Văn Việt, Phường Tăng Nhơn Phú A, TP HCM',
      ],
      link: {
        href: 'https://help.shopee.vn/portal/4/article/77243?previousPage=other+articles',
        label: 'Tham khảo điều khoản dịch vụ của Shopee',
      },
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  type: 'terms',
  title: 'Điều khoản sử dụng',
  version: 'Phiên bản 1.0',
  effectiveDate: '01/06/2026',
  updatedDate: '01/06/2026',
  sections: [
    {
      id: 'gioi-thieu',
      title: '1. Giới thiệu',
      paragraphs: [
        'Chào mừng bạn đến với Nông Sản Xấu Mã tại website nongsanxauma.vn. Trước khi sử dụng Nền Tảng hoặc tạo tài khoản, vui lòng đọc kỹ Điều Khoản Sử Dụng này để hiểu rõ quyền lợi và nghĩa vụ của bạn.',
        'Nông Sản Xấu Mã là nền tảng kết nối giữa nông dân/nhà vườn với người mua cá nhân (B2C) và doanh nghiệp F&B (B2B), chuyên cung cấp nông sản "không đạt chuẩn thẩm mỹ", tức là trái cây, củ quả có hình dáng hoặc kích cỡ không đồng đều nhưng vẫn đảm bảo chất lượng dinh dưỡng và an toàn thực phẩm, với mức giá thấp hơn 30-50% so với hàng Grade 1 trên thị trường.',
        'Bằng việc truy cập Nền Tảng hoặc tạo tài khoản, bạn xác nhận đã đọc, hiểu và đồng ý ràng buộc bởi toàn bộ nội dung Điều Khoản Sử Dụng này. NẾU BẠN KHÔNG ĐỒNG Ý, VUI LÒNG KHÔNG SỬ DỤNG DỊCH VỤ.',
        'Chúng tôi bảo lưu quyền thay đổi, chỉnh sửa hoặc tạm ngưng Nền Tảng hoặc bất kỳ phần nào của dịch vụ theo lộ trình phù hợp với quy định của pháp luật và sẽ thông báo trước cho người dùng theo quy định tại Mục 12.',
      ],
    },
    {
      id: 'doi-tuong-su-dung',
      title: '2. Đối tượng sử dụng',
      paragraphs: [
        'Điều khoản này áp dụng cho tất cả người dùng, bao gồm: Người mua cá nhân (B2C); Doanh nghiệp F&B (B2B); Nhà cung cấp: nông dân, nhà vườn, hợp tác xã nông nghiệp đăng ký bán hàng trên Nền Tảng.',
        'Nếu bạn chưa đủ 18 tuổi, bạn cần có sự đồng ý của cha mẹ hoặc người giám hộ hợp pháp trước khi tạo tài khoản hoặc thực hiện giao dịch.',
      ],
    },
    {
      id: 'tai-khoan',
      title: '3. Tài khoản người dùng',
      paragraphs: [
        'Để đặt hàng hoặc đăng ký bán hàng, bạn cần tạo tài khoản với thông tin trung thực, chính xác và cập nhật. Bạn cam kết bảo mật thông tin đăng nhập, đăng xuất sau mỗi phiên nếu dùng thiết bị chung, và thông báo ngay nếu phát hiện truy cập trái phép.',
        'Bạn chịu hoàn toàn trách nhiệm với mọi hoạt động phát sinh từ tài khoản của mình. Chúng tôi có quyền tạm khóa hoặc chấm dứt tài khoản khi cung cấp thông tin giả mạo, vi phạm điều khoản, gian lận hoặc gây hại đến người dùng khác.',
      ],
    },
    {
      id: 'dat-hang-thanh-toan',
      title: '4. Đặt hàng và thanh toán',
      paragraphs: [
        'Đơn hàng được xem là hợp lệ sau khi bạn nhận được thông báo xác nhận từ hệ thống qua email hoặc tin nhắn.',
        'Giá niêm yết trên Nền Tảng đã bao gồm thuế VAT (nếu có). Phí giao hàng được hiển thị rõ ràng tại bước thanh toán.',
        'Chúng tôi có quyền từ chối hoặc hủy đơn hàng trong các trường hợp: hàng hóa hết hàng, thông tin giao hàng không hợp lệ, hoặc phát hiện dấu hiệu gian lận.',
        'Hiện tại Nền Tảng hỗ trợ các hình thức thanh toán: chuyển khoản ngân hàng, ví điện tử (MoMo, ZaloPay) và thanh toán khi nhận hàng (COD) tại một số khu vực.',
      ],
    },
    {
      id: 'giao-hang-nhan-hang',
      title: '5. Giao hàng và nhận hàng',
      paragraphs: [
        'Dịch vụ giao hàng hiện tập trung tại TP. Hồ Chí Minh. Phạm vi địa lý có thể được mở rộng theo từng giai đoạn và sẽ được thông báo trên Nền Tảng.',
        'Sau khi đặt hàng thành công, thời gian giao hàng dự kiến sẽ được hiển thị trong đơn hàng. Chúng tôi nỗ lực giao hàng đúng thời hạn, tuy nhiên, không đảm bảo hoàn toàn trong các trường hợp bất khả kháng (thiên tai, kẹt xe nghiêm trọng, v.v.).',
        'Rủi ro về hàng hóa chuyển giao cho người mua kể từ thời điểm giao hàng thành công.',
      ],
    },
    {
      id: 'doi-tra-hoan-tien',
      title: '6. Chính sách đổi trả và hoàn tiền',
      paragraphs: [
        'Thời hạn báo lỗi: Khách hàng có 24 giờ kể từ khi nhận hàng để báo lỗi. Sau thời gian này, chúng tôi không thể xác định lỗi do vận chuyển hay do bảo quản sai, nên sẽ không xử lý bồi thường.',
        'Cách báo lỗi: Chụp ảnh phần hàng bị hư và gửi vào hộp chat tin nhắn trên website. Chúng tôi sẽ xem xét và xác nhận đây là hàng bị hư thật (không phải là xấu mã bình thường), sau đó ước tính tỷ lệ hư so với tổng đơn để xử lý phù hợp.',
        'Chúng tôi không chấp nhận đổi trả với lý do thẩm mỹ bề ngoài như hình dạng không đều, màu sắc không đồng nhất, hoặc kích cỡ nhỏ hơn mong đợi. Đây là đặc tính cốt lõi của sản phẩm "xấu mã".',
      ],
      table: {
        headers: ['Tỷ lệ hàng hư trên tổng đơn', 'Cách xử lý'],
        rows: [
          [
            'Dưới 5%',
            'Xin lỗi và ghi nhận, không bồi thường. Do đặc thù nông sản xấu mã, một tỷ lệ hao hụt nhỏ là không thể tránh khỏi và đã được tính vào mức giá.',
          ],
          [
            'Trên 5%',
            'Hoàn tiền phần hàng hư + tặng voucher giảm 10-15% có thời hạn cho đơn tiếp theo.',
          ],
        ],
      },
    },
    {
      id: 'chat-luong-an-toan',
      title: '7. Cam kết chất lượng và an toàn thực phẩm',
      paragraphs: [
        'Chúng tôi ưu tiên làm việc với các nhà cung cấp có chứng nhận VietGAP hoặc các tiêu chuẩn tương đương.',
        'Mỗi lô hàng được kiểm tra mẫu đại diện tại kho trung chuyển theo quy trình lấy mẫu (Representative Lot Sampling) nhằm phân biệt "xấu vỏ" và "hỏng ruột".',
        'Thông tin nguồn gốc, ngày thu hoạch và chứng nhận chất lượng (nếu có) được hiển thị minh bạch trên từng sản phẩm.',
        'Do đặc thù của nông sản tươi sống, chúng tôi không đảm bảo đồng đều tuyệt đối về kích cỡ, màu sắc hoặc hình dạng giữa các lô hàng.',
      ],
    },
    {
      id: 'hanh-vi-bi-cam',
      title: '8. Hành vi bị cấm',
      paragraphs: ['Khi sử dụng Nền Tảng, người dùng không được thực hiện các hành vi sau:'],
      listItems: [
        'Cung cấp thông tin giả mạo khi đăng ký tài khoản hoặc đặt hàng.',
        'Lạm dụng chính sách đổi trả, tạo đơn hàng ảo hoặc gian lận thanh toán.',
        'Sao chép, phân phối lại thông tin sản phẩm, hình ảnh, dữ liệu giá mà không có sự đồng ý bằng văn bản.',
        'Can thiệp vào hệ thống kỹ thuật hoặc thực hiện các hành vi tấn công mạng.',
        'Sử dụng thông tin người dùng khác vào mục đích thương mại hoặc phi pháp.',
        '(Dành cho nhà cung cấp) Đăng tải thông tin sản phẩm sai lệch hoặc che giấu các khuyết điểm ảnh hưởng đến an toàn thực phẩm.',
      ],
      note: 'Vi phạm các điều trên có thể dẫn đến khóa tài khoản vĩnh viễn và/hoặc xử lý theo quy định của pháp luật hiện hành của Việt Nam.',
    },
    {
      id: 'so-huu-tri-tue',
      title: '9. Sở hữu trí tuệ',
      paragraphs: [
        'Toàn bộ nội dung trên Nền Tảng, bao gồm tên thương hiệu "Nông Sản Xấu Mã", logo, hình ảnh, giao diện, văn bản mô tả và mã nguồn, là tài sản trí tuệ của chúng tôi và được bảo hộ theo pháp luật Việt Nam.',
        'Người dùng được phép chia sẻ liên kết sản phẩm cho mục đích cá nhân phi thương mại. Mọi hình thức tái sử dụng thương mại cần có sự chấp thuận bằng văn bản.',
      ],
    },
    {
      id: 'quyen-rieng-tu',
      title: '10. Quyền riêng tư và bảo mật dữ liệu',
      paragraphs: [
        'Chúng tôi thu thập thông tin cá nhân (họ tên, số điện thoại, địa chỉ giao hàng, email) để thực hiện đơn hàng và cải thiện dịch vụ.',
        'Chúng tôi cam kết không bán hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba vì mục đích thương mại; chỉ chia sẻ thông tin cần thiết với đối tác vận chuyển; lưu trữ dữ liệu trong môi trường bảo mật; xóa thông tin định danh sau khi kết thúc mục đích sử dụng.',
        'Chúng tôi tuân thủ các quy định về bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam.',
      ],
    },
    {
      id: 'gioi-han-trach-nhiem',
      title: '11. Giới hạn trách nhiệm',
      paragraphs: [
        'Chúng tôi không đảm bảo tính sẵn sàng liên tục 24/7 của Nền Tảng. Trong các trường hợp bảo trì, sự cố kỹ thuật hoặc bất khả kháng, dịch vụ có thể bị gián đoạn tạm thời.',
        'Chúng tôi không chịu trách nhiệm đối với các tổn thất phát sinh từ việc người dùng cung cấp sai thông tin giao hàng hoặc thanh toán.',
        'Trách nhiệm tối đa của chúng tôi trong mọi trường hợp không vượt quá giá trị đơn hàng thực tế mà người dùng đã thanh toán.',
      ],
    },
    {
      id: 'cap-nhat-lien-he',
      title: '12. Cập nhật điều khoản và liên hệ',
      paragraphs: [
        'Chúng tôi có thể cập nhật Điều Khoản Sử Dụng này theo thời gian. Phiên bản mới sẽ được thông báo trên Nền Tảng và/hoặc qua email ít nhất 7 ngày trước khi có hiệu lực. Việc tiếp tục sử dụng dịch vụ sau ngày có hiệu lực đồng nghĩa với sự chấp thuận điều khoản mới.',
        'Mọi thắc mắc hoặc khiếu nại liên quan đến Điều Khoản Sử Dụng, vui lòng liên hệ qua kênh hỗ trợ tại nongsanxauma.vn',
      ],
    },
  ],
};

export const LEGAL_DOCS: Record<LegalDocType, LegalDocument> = {
  privacy: PRIVACY_POLICY,
  terms: TERMS_OF_SERVICE,
};

export function getLegalPath(type: LegalDocType): string {
  return type === 'privacy' ? '/chinh-sach-bao-mat' : '/dieu-khoan-su-dung';
}
