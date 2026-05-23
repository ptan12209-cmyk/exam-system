import { SupabaseClient } from '@supabase/supabase-js';
import { ApiError } from '@/lib/api-utils';
import { createPaymentUrl, generateOrderId } from '@/lib/vnpay';

export class PaymentServerService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Create a VNPay payment for a subscription or package purchase.
   * Validates input, looks up plan/package from DB, creates pending records,
   * generates VNPay payment URL, and updates the purchase record.
   */
  async createPayment(params: {
    userId: string;
    type: 'subscription' | 'package';
    planId?: string;
    packageId?: string;
    billingCycle?: string;
    ipAddress: string;
    origin: string;
  }): Promise<{
    success: boolean;
    free?: boolean;
    message?: string;
    paymentUrl?: string;
    orderId?: string;
  }> {
    const { userId, type, planId, packageId, billingCycle, ipAddress, origin } = params;

    // Validate payment type
    if (!type || !['subscription', 'package'].includes(type)) {
      throw new ApiError('INVALID_TYPE', 'Invalid payment type', 400);
    }

    let amount = 0;
    let orderInfo = '';
    let subscriptionId: string | null = null;
    let purchasePackageId: string | null = null;

    if (type === 'subscription') {
      if (!planId) {
        throw new ApiError('MISSING_PLAN_ID', 'Plan ID is required', 400);
      }

      // Get plan details
      const { data: plan, error: planError } = await this.supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) {
        throw new ApiError('PLAN_NOT_FOUND', 'Plan not found', 404);
      }

      // Calculate amount based on billing cycle
      amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
      orderInfo = `Đăng ký gói ${plan.name} - ${billingCycle === 'yearly' ? 'Năm' : 'Tháng'}`;

      // Create pending subscription
      const expiresAt = new Date();
      if (billingCycle === 'yearly') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      const { data: subscription, error: subError } = await this.supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: planId,
          status: 'pending',
          billing_cycle: billingCycle || 'monthly',
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (subError || !subscription) {
        console.error('Create subscription error:', subError);
        throw new ApiError('CREATE_SUBSCRIPTION_FAILED', 'Failed to create subscription', 500);
      }

      subscriptionId = subscription.id;
    } else if (type === 'package') {
      if (!packageId) {
        throw new ApiError('MISSING_PACKAGE_ID', 'Package ID is required', 400);
      }

      // Get package details
      const { data: pkg, error: pkgError } = await this.supabase
        .from('exam_packages')
        .select('*')
        .eq('id', packageId)
        .eq('is_published', true)
        .single();

      if (pkgError || !pkg) {
        throw new ApiError('PACKAGE_NOT_FOUND', 'Package not found', 404);
      }

      // Check if already purchased
      const { data: existingPurchase } = await this.supabase
        .from('purchases')
        .select('id')
        .eq('buyer_id', userId)
        .eq('package_id', packageId)
        .eq('payment_status', 'completed')
        .single();

      if (existingPurchase) {
        throw new ApiError('ALREADY_PURCHASED', 'Already purchased', 400);
      }

      amount = pkg.price;
      orderInfo = `Mua gói đề: ${pkg.title}`;
      purchasePackageId = packageId;
    }

    // Handle free items (amount === 0)
    if (amount === 0) {
      if (subscriptionId) {
        await this.supabase
          .from('user_subscriptions')
          .update({ status: 'active' })
          .eq('id', subscriptionId);
      }

      if (purchasePackageId) {
        await this.supabase.from('purchases').insert({
          buyer_id: userId,
          package_id: purchasePackageId,
          amount: 0,
          payment_status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      return {
        success: true,
        free: true,
        message: 'Đăng ký thành công (miễn phí)',
      };
    }

    // Generate order ID
    const orderId = generateOrderId();

    // Create payment record
    const { data: purchase, error: purchaseError } = await this.supabase
      .from('purchases')
      .insert({
        buyer_id: userId,
        package_id: purchasePackageId,
        subscription_id: subscriptionId,
        amount,
        payment_provider: 'vnpay',
        payment_id: orderId,
        payment_status: 'pending',
      })
      .select()
      .single();

    if (purchaseError || !purchase) {
      console.error('Create purchase error:', purchaseError);
      throw new ApiError('CREATE_PURCHASE_FAILED', 'Failed to create payment record', 500);
    }

    // Get base URL for return
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || origin;
    const returnUrl = `${baseUrl}/api/payments/callback`;

    // Create VNPay payment URL
    const paymentResult = await createPaymentUrl({
      orderId,
      amount,
      orderInfo,
      returnUrl,
      ipAddress,
    });

    if (!paymentResult.success || !paymentResult.paymentUrl) {
      throw new ApiError(
        'PAYMENT_URL_FAILED',
        paymentResult.error || 'Failed to create payment URL',
        500
      );
    }

    // Update purchase with payment URL
    await this.supabase
      .from('purchases')
      .update({ payment_url: paymentResult.paymentUrl })
      .eq('id', purchase.id);

    return {
      success: true,
      paymentUrl: paymentResult.paymentUrl,
      orderId,
    };
  }

  /**
   * Get payment history for a user, including joined package and subscription data.
   */
  async getPaymentHistory(userId: string) {
    const { data: purchases, error } = await this.supabase
      .from('purchases')
      .select(
        `
                *,
                package:exam_packages(id, title),
                subscription:user_subscriptions(id, plan:subscription_plans(name))
            `
      )
      .eq('buyer_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Get payments error:', error);
      throw new ApiError('FETCH_PAYMENTS_FAILED', 'Failed to fetch payments', 500);
    }

    return purchases || [];
  }
}
