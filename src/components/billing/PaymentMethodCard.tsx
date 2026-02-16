export function PaymentMethodCard() {
  return (
    <div className="card">
      <div className="p-6">
        <h3 className="font-display text-lg mb-4">Payment Method</h3>

        <div className="p-4 bg-char-700 rounded-btn mb-4">
          <p className="text-sm text-ash-300 mb-2">
            Payment methods are managed securely through Stripe.
          </p>
          <p className="text-xs text-ash-500">
            Coming soon: Direct access to manage your payment methods and view invoices.
          </p>
        </div>

        <button
          className="btn-ghost w-full"
          disabled
        >
          Manage Payment Methods
        </button>
      </div>
    </div>
  );
}
