import React, { useState, useEffect } from 'react';
import { Newspaper, Plus, Search, Filter, Edit3, Trash2, Eye, Calendar, User, Clock, CheckCircle2, ChevronLeft, ChevronRight, RefreshCcw, AlertCircle } from 'lucide-react';
import { blogService, BlogResponse, BlogCreationRequest } from '../../services';
import { BlogCategory, BlogCategoryLabel, PageResponse } from '../../types';
import MyCKEditor from '../../components/MyCKEditor';
import Pagination, { PageInfo } from '../../components/ui/Pagination';
import { globalShowAlert, globalShowConfirm } from '../../contexts/PopupContext';

const NewsManagement: React.FC = () => {
   const [blogs, setBlogs] = useState<BlogResponse[]>([]);
   const [loading, setLoading] = useState(true);
   const [isAddingNew, setIsAddingNew] = useState(false);
   const [error, setError] = useState<string | null>(null);

   // Pagination state
   const [page, setPage] = useState(0);
   const [pageSize] = useState(10);
   const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);

   // Filter state
   const [searchQuery, setSearchQuery] = useState('');
   const [selectedFilterCategory, setSelectedFilterCategory] = useState('Tất cả danh mục');

   // Form state
   const [title, setTitle] = useState('');
   const [content, setContent] = useState('');
   const [status, setStatus] = useState('DRAFT');
   const [category, setCategory] = useState(BlogCategory.SUC_KHOE);
   const [selectedImage, setSelectedImage] = useState<File | null>(null);
   const [imagePreview, setImagePreview] = useState<string | null>(null);
   const [submitting, setSubmitting] = useState(false);

   // View/Edit state
   const [isViewing, setIsViewing] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [selectedBlog, setSelectedBlog] = useState<BlogResponse | null>(null);

   const clearForm = () => {
      setTitle('');
      setContent('');
      setCategory(BlogCategory.SUC_KHOE);
      setStatus('DRAFT');
      setSelectedImage(null);
      setImagePreview(null);
      setIsEditing(false);
      setIsAddingNew(false);
      setSelectedBlog(null);
   };

   const clearFilters = () => {

      setSearchQuery('');
      setSelectedFilterCategory('Tất cả danh mục');
   };

   useEffect(() => {
      fetchBlogs();
   }, [page]);

   // Filter blogs based on search and category
   const filteredBlogs = blogs.filter(blog => {
      const matchesSearch = searchQuery === '' || 
         blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         blog.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedFilterCategory === 'Tất cả danh mục' || 
         blog.category === selectedFilterCategory;
      
      return matchesSearch && matchesCategory;
   });

   const fetchBlogs = async () => {
      try {
         setLoading(true);
         const response = await blogService.getAllBlogsPaged(page, pageSize);
         if (response.result) {
            setBlogs(response.result.content);
            setPageInfo({
               page: response.result.page,
               size: response.result.size,
               totalElements: response.result.totalElements,
               totalPages: response.result.totalPages,
               first: response.result.first,
               last: response.result.last,
            });
         }
      } catch (err) {
         console.error('Failed to fetch blogs', err);
         setError('Không thể tải danh sách bài viết.');
      } finally {
         setLoading(false);
      }
   };


   const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
         const file = e.target.files[0];
         setSelectedImage(file);
         setImagePreview(URL.createObjectURL(file));
      }
   };

   const handleSaveBlog = async () => {
      if (!title || !content) {
         globalShowAlert('Vui lòng nhập đầy đủ tiêu đề và nội dung.', 'Lỗi', 'error');
         return;
      }

      setSubmitting(true);
      try {
         const request: any = {
            title,
            content,
            status,
            category,
         };
         
         if (isEditing && selectedBlog) {
            const response = await blogService.updateBlog(selectedBlog.id, request, selectedImage || undefined);
            if (response.result) {
               globalShowAlert('Cập nhật bài viết thành công!', 'Thành công', 'success');
               clearForm();
               fetchBlogs();
            }
         } else {
            const response = await blogService.createBlog(request as BlogCreationRequest, selectedImage || undefined);
            if (response.result) {
               globalShowAlert('Đăng bài viết thành công!', 'Thành công', 'success');
               clearForm();
               fetchBlogs();
            }
         }
      } catch (err) {
         console.error('Failed to save blog', err);
         globalShowAlert('Lưu bài viết thất bại. Vui lòng thử lại.', 'Lỗi', 'error');
      } finally {
         setSubmitting(false);
      }
   };

   const handleDeleteBlog = async (id: number) => {
      if (!await globalShowConfirm('Xác nhận', 'Bạn có chắc chắn muốn xóa bài viết này không?')) {
         return;
      }

      try {
         await blogService.deleteBlog(id);
         setBlogs(blogs.filter(b => b.id !== id));
         globalShowAlert('Đã xóa bài viết thành công.', 'Thành công', 'success');
      } catch (err) {
         console.error('Failed to delete blog', err);
         globalShowAlert('Xóa bài viết thất bại.', 'Lỗi', 'error');
      }
   };

   const handleToggleStatus = async (blog: BlogResponse) => {
      const newStatus = blog.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
      try {
         await blogService.updateBlog(blog.id, {
            title: blog.title,
            content: blog.content,
            status: newStatus,
            category: blog.category as unknown as BlogCategory
         });
         setBlogs(blogs.map(b => b.id === blog.id ? { ...b, status: newStatus } : b));
      } catch (err) {
         console.error('Failed to update blog status', err);
         globalShowAlert('Đổi trạng thái thất bại.', 'Lỗi', 'error');
      }
   };

   const handleEditBlog = (blog: BlogResponse) => {
      setSelectedBlog(blog);
      setTitle(blog.title);
      setContent(blog.content);
      setCategory(blog.category as unknown as BlogCategory);
      setStatus(blog.status);
      setImagePreview(blog.pictureUrl);
      setIsEditing(true);
      setIsAddingNew(false);
      setIsViewing(false);
   };

   const handleViewBlog = (blog: BlogResponse) => {
      setSelectedBlog(blog);
      setIsViewing(true);
      setIsAddingNew(false);
      setIsEditing(false);
   };


   // Calculate statistics
   const totalViews = blogs.reduce((sum, b) => sum + (b.views || 0), 0);
   const newBlogsThisMonth = blogs.filter(b => {
      const date = new Date(b.createAt);
      const now = new Date();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
   }).length;

   if (isAddingNew || isEditing) {
      return (
         <div className="flex flex-col gap-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center gap-6">
               <button onClick={clearForm} className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                  <ChevronLeft className="size-5" />
               </button>
               <div>
                  <h2 className="text-3xl font-black font-display text-gray-900 uppercase tracking-tight">{isEditing ? 'Cập nhật bài viết' : 'Viết bài mới'}</h2>
                  <p className="text-gray-400 font-medium text-sm mt-1">
                     {isEditing ? 'Chỉnh sửa nội dung bài viết của bạn.' : 'Sáng tạo nội dung hữu ích cho cộng đồng XẤU MÃ.'}
                  </p>
               </div>
               <div className="flex gap-4 ml-auto">
                  <button
                     onClick={handleSaveBlog}
                     disabled={submitting}
                     className="px-8 py-3 bg-primary text-white rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95 disabled:bg-gray-300"
                  >
                     {submitting ? 'Đang lưu...' : (isEditing ? 'Cập nhật ngay' : 'Đăng bài ngay')}
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
               <div className="lg:col-span-2 flex flex-col gap-8">
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                     <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Tiêu đề bài viết</label>
                        <input
                           type="text"
                           value={title}
                           onChange={(e) => setTitle(e.target.value)}
                           placeholder="Ví dụ: Hành trình giải cứu 10 tấn cam sành..."
                           className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all"
                        />
                     </div>
                     <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Nội dung bài viết</label>
                        <MyCKEditor 
                           value={content}
                           onChange={setContent}
                           placeholder="Viết nội dung tại đây..."
                        />
                     </div>
                  </div>
               </div>

               <div className="flex flex-col gap-8">
                  <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm p-10 space-y-8">
                     <h4 className="font-black text-gray-800 uppercase tracking-tight">Thiết lập xuất bản</h4>
                     <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Danh mục</label>
                        <select
                           value={category}
                           onChange={(e) => setCategory(e.target.value as BlogCategory)}
                           className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-[10px] font-black text-gray-600 outline-none uppercase tracking-widest"
                        >
                           <option value={BlogCategory.SUC_KHOE}>{BlogCategoryLabel[BlogCategory.SUC_KHOE]}</option>
                           <option value={BlogCategory.CAM_NANG}>{BlogCategoryLabel[BlogCategory.CAM_NANG]}</option>
                           <option value={BlogCategory.NHA_NONG}>{BlogCategoryLabel[BlogCategory.NHA_NONG]}</option>
                           <option value={BlogCategory.XU_HUONG}>{BlogCategoryLabel[BlogCategory.XU_HUONG]}</option>
                        </select>
                     </div>
                     <div className="flex flex-col gap-3">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Trạng thái</label>
                        <select
                           value={status}
                           onChange={(e) => setStatus(e.target.value)}
                           className="w-full px-6 py-4 bg-gray-50 border border-transparent rounded-2xl text-[10px] font-black text-gray-600 outline-none uppercase tracking-widest"
                        >
                           <option value="DRAFT">Lưu nháp</option>
                           <option value="PUBLISHED">Xuất bản ngay</option>
                        </select>
                     </div>
                     <div className="flex flex-col gap-4">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Ảnh bìa</label>
                        <div
                           className="aspect-video w-full border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center text-center gap-4 hover:border-primary/40 hover:bg-primary/5 cursor-pointer transition-all relative overflow-hidden group"
                           onClick={() => document.getElementById('blog-image-upload')?.click()}
                        >
                           {imagePreview ? (
                              <img src={imagePreview} className="absolute inset-0 w-full h-full object-cover" />
                           ) : (
                              <>
                                 <Plus className="size-8 text-gray-300" />
                                 <p className="text-[10px] font-black text-gray-400 uppercase">Tải ảnh lên</p>
                              </>
                           )}
                        </div>
                        <input
                           id="blog-image-upload"
                           type="file"
                           className="hidden"
                           accept="image/*"
                           onChange={handleImageChange}
                        />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   }


   if (isViewing && selectedBlog) {
      return (
         <div className="flex flex-col gap-8 p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex items-center gap-6">
               <button onClick={() => setIsViewing(false)} className="size-11 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all shadow-sm">
                  <ChevronLeft className="size-5" />
               </button>
               <div>
                  <h2 className="text-3xl font-black font-display text-gray-900 uppercase tracking-tight">Chi tiết bài viết</h2>
                  <p className="text-gray-400 font-medium text-sm mt-1">Xem lại nội dung đã xuất bản.</p>
               </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
               <div className="aspect-[21/9] w-full relative">
                  <img
                     src={selectedBlog.pictureUrl || `https://picsum.photos/seed/news${selectedBlog.id}/1200/400`}
                     className="w-full h-full object-cover"
                     alt="cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-12">
                     <div className="max-w-4xl">
                        <div className="flex items-center gap-4 text-[10px] font-black text-white/80 uppercase tracking-widest mb-4">
                           <span className="px-3 py-1 bg-primary text-white rounded-lg">{BlogCategoryLabel[selectedBlog.category as BlogCategory] ?? selectedBlog.category}</span>
                           <span>{new Date(selectedBlog.createAt).toLocaleDateString('vi-VN')}</span>
                           <span>Bởi: {selectedBlog.adminName}</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black text-white font-display uppercase tracking-tight">{selectedBlog.title}</h1>
                     </div>
                  </div>
               </div>
               <div className="p-12 md:p-20">
                  <div className="prose prose-lg max-w-none text-gray-600 font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: selectedBlog.content }} />
               </div>
            </div>
         </div>
      );
   }

   return (
      <div className="flex flex-col gap-8 p-8 animate-in fade-in duration-500">
         <div className="flex justify-between items-center">
            <div>
               <h2 className="text-3xl font-black font-display text-gray-900 uppercase tracking-tight">Quản lý tin tức</h2>
               <p className="text-gray-400 font-medium text-sm mt-1">Quản lý nội dung bài viết, cẩm nang và tin tức nông sản trên hệ thống.</p>
            </div>
            <button onClick={() => setIsAddingNew(true)} className="px-8 py-3 bg-primary text-white rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all transform active:scale-95">
               <Plus className="size-5" /> Viết bài mới
            </button>
         </div>

         {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl font-bold flex items-center gap-3">
               <AlertCircle className="size-5" />
               {error}
            </div>
         )}


         <div className="bg-white rounded-[40px] border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-10 py-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-6">
               <div className="flex items-center gap-6 flex-1 max-w-2xl">
                  <div className="relative flex-1">
                     <input 
                        type="text" 
                        placeholder="Tìm kiếm bài viết..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all" 
                     />
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-gray-300" />
                  </div>
                  <select 
                     value={selectedFilterCategory}
                     onChange={(e) => setSelectedFilterCategory(e.target.value)}
                     className="px-6 py-3 bg-gray-50 border border-transparent rounded-2xl text-[10px] font-black text-gray-600 outline-none uppercase tracking-widest cursor-pointer"
                  >
                     <option>Tất cả danh mục</option>
                     <option value={BlogCategory.SUC_KHOE}>{BlogCategoryLabel[BlogCategory.SUC_KHOE]}</option>
                     <option value={BlogCategory.CAM_NANG}>{BlogCategoryLabel[BlogCategory.CAM_NANG]}</option>
                     <option value={BlogCategory.NHA_NONG}>{BlogCategoryLabel[BlogCategory.NHA_NONG]}</option>
                     <option value={BlogCategory.XU_HUONG}>{BlogCategoryLabel[BlogCategory.XU_HUONG]}</option>
                  </select>
               </div>
               <div className="flex gap-4">
                  <button 
                     onClick={clearFilters}
                     className="size-11 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 hover:text-red-500 transition-colors"
                     title="Xóa bộ lọc"
                  >
                     <RefreshCcw className="size-5" />
                  </button>
                  <button className="size-11 flex items-center justify-center bg-gray-50 rounded-2xl text-gray-400 hover:text-primary transition-colors">
                     <Filter className="size-5" />
                  </button>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead className="bg-gray-50/50">
                     <tr>
                        <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Bài viết</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Danh mục</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Người viết</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Lượt xem</th>
                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                        <th className="px-10 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Thao tác</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                     {loading ? (
                        <tr>
                           <td colSpan={6} className="px-10 py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">Đang tải bài viết...</td>
                        </tr>
                     ) : filteredBlogs.length === 0 ? (
                        <tr>
                           <td colSpan={6} className="px-10 py-20 text-center text-xs font-black text-gray-400 uppercase tracking-widest">
                              {blogs.length === 0 ? 'Chưa có bài viết nào' : 'Không tìm thấy bài viết phù hợp'}
                           </td>
                        </tr>
                     ) : (
                        filteredBlogs.map((art) => (
                           <tr key={art.id} className="hover:bg-gray-50/30 transition-colors group">
                              <td className="px-10 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="size-12 bg-gray-100 rounded-xl overflow-hidden shadow-sm shrink-0">
                                       <img src={art.pictureUrl || `https://picsum.photos/seed/news${art.id}/80/80`} className="w-full h-full object-cover" alt="thumb" />
                                    </div>
                                    <div>
                                       <p className="text-sm font-black text-gray-900 line-clamp-1">{art.title}</p>
                                       <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Ngày đăng: {new Date(art.createAt).toLocaleDateString('vi-VN')}</p>
                                    </div>
                                 </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <span className="inline-block px-3 py-1 bg-green-50 text-primary text-[10px] font-black rounded-lg uppercase tracking-tight whitespace-nowrap">
                                    {BlogCategoryLabel[art.category as BlogCategory] ?? art.category}
                                 </span>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <div className="flex flex-col items-center justify-center">
                                    <span className="text-xs font-bold text-gray-600 whitespace-nowrap">{art.adminName}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <div className="flex items-center justify-center gap-1.5 text-gray-400">
                                    <Eye className="size-3" />
                                    <span className="text-xs font-bold">{art.views || 0}</span>
                                 </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                 <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap ${art.status === 'PUBLISHED' ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-50'}`}>
                                    {art.status === 'PUBLISHED' ? 'Đã đăng' : 'Bản nháp'}
                                 </span>
                              </td>
                              <td className="px-10 py-6 text-right">
                                 <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                       title="Đổi trạng thái"
                                       onClick={() => handleToggleStatus(art)}
                                       className="size-9 bg-gray-50 text-orange-500 rounded-xl flex items-center justify-center hover:bg-orange-50 transition-colors"
                                    >
                                       <RefreshCcw className="size-4" />
                                    </button>
                                    <button
                                       title="Chỉnh sửa"
                                       onClick={() => handleEditBlog(art)}
                                       className="size-9 bg-gray-50 text-blue-500 rounded-xl flex items-center justify-center hover:bg-blue-50 transition-colors"
                                    >
                                       <Edit3 className="size-4" />
                                    </button>
                                    <button
                                       title="Xem chi tiết"
                                       onClick={() => handleViewBlog(art)}
                                       className="size-9 bg-gray-50 text-primary rounded-xl flex items-center justify-center hover:bg-primary/10 transition-colors"
                                    >
                                       <Eye className="size-4" />
                                    </button>
                                    <button
                                       title="Xóa bài viết"
                                       onClick={() => handleDeleteBlog(art.id)}
                                       className="size-9 bg-gray-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-50 transition-colors"
                                    >
                                       <Trash2 className="size-4" />
                                    </button>
                                 </div>
                              </td>

                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>

            {pageInfo && (
               <div className="p-10 bg-white border-t border-gray-50 flex items-center justify-between">
                  <Pagination pageInfo={pageInfo} onPageChange={setPage} />
               </div>
            )}

         </div>

         <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-[#38703d] rounded-[40px] p-10 text-white flex flex-col justify-between h-64 shadow-xl shadow-green-900/10">
               <div>
                  <Newspaper className="size-10 mb-4 opacity-50" />
                  <h4 className="text-2xl font-black uppercase tracking-tight leading-tight">Mẹo viết tiêu đề <br />thu hút người mua</h4>
               </div>
               <button className="w-fit text-[10px] font-black uppercase tracking-[0.2em] border-b-2 border-white/30 pb-1 hover:border-white transition-all">Xem cẩm nang Admin</button>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col justify-center gap-6 shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="size-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                     <CheckCircle2 className="size-8" />
                  </div>
                  <div>
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BÀI VIẾT HIỆU QUẢ NHẤT</p>
                     <h4 className="text-lg font-black text-gray-900 leading-tight mt-1">Giải cứu Cam Sành</h4>
                  </div>
               </div>
               <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed italic">
                     "Bài viết này đã giúp tăng 150% lượt click vào danh mục Trái Cây trong tuần qua."
                  </p>
               </div>
            </div>

            <div className="bg-white rounded-[40px] border border-gray-100 p-10 flex flex-col justify-center gap-4 shadow-sm relative overflow-hidden">
               <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight">Thống kê tháng</h4>
               <div className="space-y-4">
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-gray-400 uppercase">Bài mới:</span>
                     <span className="text-lg font-black text-primary">{newBlogsThisMonth}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full">
                     <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((newBlogsThisMonth / 20) * 100, 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                     <span className="text-xs font-bold text-gray-400 uppercase">Tổng views:</span>
                     <span className="text-lg font-black text-gray-900">{totalViews.toLocaleString('vi-VN')}</span>
                  </div>
               </div>
               <div className="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full blur-2xl" />
            </div>
         </div>
      </div>
   );
};

export default NewsManagement;