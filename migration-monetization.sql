-- =============================================
-- MONETIZATION SYSTEM: Subscriptions & Marketplace
-- Run this in Supabase SQL Editor
-- =============================================

-- =============================================
-- 1. SUBSCRIPTION PLANS (Gói đăng ký cho Teachers)
-- =============================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    description text,
    price_monthly integer NOT NULL, -- VND
    price_yearly integer, -- VND (discount for yearly)
    features jsonb DEFAULT '[]', -- Array of feature strings
    max_exams integer DEFAULT 10,
    max_questions_per_exam integer DEFAULT 50,
    max_students integer DEFAULT 100,
    ai_grading_enabled boolean DEFAULT false,
    priority_support boolean DEFAULT false,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- =============================================
-- 2. USER SUBSCRIPTIONS (Đăng ký của người dùng)
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users NOT NULL,
    plan_id uuid REFERENCES public.subscription_plans NOT NULL,
    status text DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'trial', 'pending')),
    billing_cycle text DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
    started_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    cancelled_at timestamptz,
    payment_provider text DEFAULT 'vnpay',
    external_subscription_id text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 3. EXAM PACKAGES (Gói đề thi bán)
-- =============================================
CREATE TABLE IF NOT EXISTS public.exam_packages (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id uuid REFERENCES auth.users NOT NULL,
    title text NOT NULL,
    description text,
    cover_image text,
    price integer NOT NULL CHECK (price >= 0), -- VND, 0 = free
    original_price integer, -- For showing discount
    exam_ids uuid[] DEFAULT '{}',
    category text,
    tags text[] DEFAULT '{}',
    is_published boolean DEFAULT false,
    sales_count integer DEFAULT 0,
    rating_avg numeric(2,1) DEFAULT 0,
    rating_count integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =============================================
-- 4. PURCHASES (Lịch sử mua hàng)
-- =============================================
CREATE TABLE IF NOT EXISTS public.purchases (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    buyer_id uuid REFERENCES auth.users NOT NULL,
    package_id uuid REFERENCES public.exam_packages,
    subscription_id uuid REFERENCES public.user_subscriptions,
    amount integer NOT NULL, -- VND
    payment_provider text DEFAULT 'vnpay',
    payment_id text, -- VNPay transaction ID
    payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    payment_url text, -- VNPay payment URL
    payment_data jsonb DEFAULT '{}', -- Full payment response
    created_at timestamptz DEFAULT now(),
    completed_at timestamptz
);

-- =============================================
-- 5. PACKAGE REVIEWS (Đánh giá gói đề)
-- =============================================
CREATE TABLE IF NOT EXISTS public.package_reviews (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_id uuid REFERENCES public.exam_packages NOT NULL,
    user_id uuid REFERENCES auth.users NOT NULL,
    rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment text,
    created_at timestamptz DEFAULT now(),
    UNIQUE(package_id, user_id)
);

-- =============================================
-- 6. ENABLE RLS
-- =============================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.package_reviews ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS POLICIES - SUBSCRIPTION PLANS
-- =============================================
CREATE POLICY "Anyone can view active plans" ON public.subscription_plans
    FOR SELECT TO authenticated
    USING (is_active = true);

-- =============================================
-- 8. RLS POLICIES - USER SUBSCRIPTIONS
-- =============================================
CREATE POLICY "Users can view own subscriptions" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions" ON public.user_subscriptions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON public.user_subscriptions
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================
-- 9. RLS POLICIES - EXAM PACKAGES
-- =============================================
CREATE POLICY "Anyone can view published packages" ON public.exam_packages
    FOR SELECT TO authenticated
    USING (is_published = true);

CREATE POLICY "Creators can view own packages" ON public.exam_packages
    FOR SELECT USING (auth.uid() = creator_id);

CREATE POLICY "Creators can manage own packages" ON public.exam_packages
    FOR ALL USING (auth.uid() = creator_id);

-- =============================================
-- 10. RLS POLICIES - PURCHASES
-- =============================================
CREATE POLICY "Users can view own purchases" ON public.purchases
    FOR SELECT USING (auth.uid() = buyer_id);

CREATE POLICY "Users can insert own purchases" ON public.purchases
    FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- Creators can view purchases of their packages
CREATE POLICY "Creators can view package sales" ON public.purchases
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.exam_packages
            WHERE id = purchases.package_id 
            AND creator_id = auth.uid()
        )
    );

-- =============================================
-- 11. RLS POLICIES - PACKAGE REVIEWS
-- =============================================
CREATE POLICY "Anyone can view reviews" ON public.package_reviews
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Buyers can add reviews" ON public.package_reviews
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM public.purchases
            WHERE buyer_id = auth.uid()
            AND package_id = package_reviews.package_id
            AND payment_status = 'completed'
        )
    );

-- =============================================
-- 12. HELPER FUNCTIONS
-- =============================================

-- Check if user has active subscription
CREATE OR REPLACE FUNCTION public.has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_subscriptions
        WHERE user_id = p_user_id
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user purchased a package
CREATE OR REPLACE FUNCTION public.has_purchased_package(p_user_id uuid, p_package_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.purchases
        WHERE buyer_id = p_user_id
        AND package_id = p_package_id
        AND payment_status = 'completed'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update package rating after review
CREATE OR REPLACE FUNCTION public.update_package_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.exam_packages
    SET 
        rating_avg = (SELECT AVG(rating)::numeric(2,1) FROM public.package_reviews WHERE package_id = NEW.package_id),
        rating_count = (SELECT COUNT(*) FROM public.package_reviews WHERE package_id = NEW.package_id)
    WHERE id = NEW.package_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_review_update_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.package_reviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_package_rating();

-- Increment sales count after purchase
CREATE OR REPLACE FUNCTION public.increment_sales_count()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND (OLD IS NULL OR OLD.payment_status != 'completed') THEN
        UPDATE public.exam_packages
        SET sales_count = sales_count + 1
        WHERE id = NEW.package_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_purchase_increment_sales
    AFTER INSERT OR UPDATE ON public.purchases
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_sales_count();

-- =============================================
-- 13. INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_exam_packages_published ON public.exam_packages(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_exam_packages_creator ON public.exam_packages(creator_id);
CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON public.purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON public.purchases(payment_status);

-- =============================================
-- 14. SAMPLE DATA - SUBSCRIPTION PLANS
-- =============================================
INSERT INTO public.subscription_plans (name, description, price_monthly, price_yearly, features, max_exams, max_questions_per_exam, max_students, ai_grading_enabled, priority_support, sort_order) VALUES
    ('Miễn phí', 'Gói cơ bản cho giáo viên mới bắt đầu', 0, 0, 
     '["Tạo tối đa 5 đề thi", "50 câu hỏi/đề", "100 học sinh", "Chấm điểm tự động"]'::jsonb,
     5, 50, 100, false, false, 1),
    ('Pro', 'Dành cho giáo viên chuyên nghiệp', 99000, 990000,
     '["Tạo không giới hạn đề thi", "200 câu hỏi/đề", "500 học sinh", "Chấm điểm AI tự luận", "Xuất Excel/PDF", "Hỗ trợ ưu tiên"]'::jsonb,
     -1, 200, 500, true, true, 2),
    ('Enterprise', 'Dành cho trường học và tổ chức', 299000, 2990000,
     '["Tất cả tính năng Pro", "Không giới hạn học sinh", "API truy cập", "Quản lý nhiều giáo viên", "Training & onboarding", "SLA 99.9%"]'::jsonb,
     -1, 500, -1, true, true, 3)
ON CONFLICT DO NOTHING;

-- =============================================
-- DONE! Run this migration in Supabase SQL Editor
-- =============================================
