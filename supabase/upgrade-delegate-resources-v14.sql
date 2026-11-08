-- Đại hội số v14: tài liệu đại biểu phải được BTC chủ động công bố.
-- Quyền đọc qua API máy chủ; mặc định tài liệu cũ không được chia sẻ.
ALTER TABLE public.documents
 ADD COLUMN IF NOT EXISTS delegate_visible boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS documents_delegate_visible_idx
 ON public.documents(congress_id,created_at DESC)
 WHERE delegate_visible=true;
COMMENT ON COLUMN public.documents.delegate_visible IS
 'BTC cho phép đại biểu cùng Đại hội đọc/tải tệp này qua API đã xác thực.';
